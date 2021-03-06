import UndoBlock, {UndoBlockParam} from 'eterna/UndoBlock';
import {OligoDef} from 'eterna/mode/PoseEdit/PoseEditMode';
import {StyledTextBuilder} from 'flashbang';
import {Graphics} from 'pixi.js';
import EPars from 'eterna/EPars';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import Utility from 'eterna/util/Utility';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, HighlightInfo, ConstraintContext} from '../Constraint';

interface OligoInfo {
    bind: boolean;
    label: string;
    name: string;
}

abstract class BindingsConstraint<ConstraintStatus extends BaseConstraintStatus> extends Constraint<ConstraintStatus> {
    public readonly stateIndex: number;

    constructor(stateIndex: number) {
        super();
        this.stateIndex = stateIndex;
    }

    protected abstract _getOligoInfo(targetConditions: any[]): OligoInfo[];

    public getConstraintBoxConfig(
        status: BaseConstraintStatus,
        forMissionScreen: boolean,
        undoBlocks: UndoBlock[],
        targetConditions: any[]
    ): ConstraintBoxConfig {
        let oligos = this._getOligoInfo(targetConditions);

        let tooltip = ConstraintBox.createTextStyle();
        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append(`In state ${this.stateIndex + 1}, your RNA must:\n`);

        for (let oligo of oligos) {
            tooltip.append('- ');
            if (forMissionScreen) {
                tooltip.pushStyle('altText');
            }
            tooltip.append(oligo.bind ? 'bind' : 'NOT bind');
            if (forMissionScreen) {
                tooltip.popStyle();
            }
            tooltip.append(` with ${oligo.name}\n`);
        }

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        let clarifyTextBuilder = new StyledTextBuilder();
        for (let ii = 0; ii < oligos.length; ii++) {
            if (ii > 0) {
                clarifyTextBuilder.append(' \u2003');
            }

            clarifyTextBuilder.append(
                `${oligos[ii].label}`,
                {fill: oligos[ii].bind ? '#ffffff' : '#808080'}
            );
        }

        let twUpper: number = Math.min(101, 15 * (2 * oligos.length - 1));
        let origUpper: number = (111 - twUpper) * 0.5;
        let twLower = oligos.length === 1 ? 45 : twUpper;
        let origLower = (111 - twLower) * 0.5;
        let step: number = twUpper / (2 * oligos.length - 1);

        let iconGraphics = new Graphics();
        iconGraphics.lineStyle(2.5, 0xFFFFFF, 0.9);
        iconGraphics.moveTo(origLower, 27);
        iconGraphics.lineTo(origLower + twLower, 27);

        for (let ii = 0; ii < oligos.length; ii++) {
            let ctrlY: number = (oligos[ii].bind ? 22 : 14);
            iconGraphics.moveTo(origUpper + (ii * 2) * step, ctrlY);
            iconGraphics.lineTo(origUpper + (ii * 2 + 1) * step, ctrlY);
        }

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: clarifyTextBuilder,
            showOutline: true,
            stateNumber: this.stateIndex + 1,
            drawBG: true,
            icon: iconGraphics
        };
    }

    public getHighlight(
        status: BaseConstraintStatus,
        context: ConstraintContext
    ): HighlightInfo {
        let undoBlock = context.undoBlocks[this.stateIndex];
        let stateCondition = context.targetConditions[this.stateIndex];

        return {
            ranges: [
                undoBlock.sequence.length + 1,
                undoBlock.sequence.length + 1 + stateCondition['oligo_sequence'].length - 1
            ],
            color: HighlightType.RESTRICTED,
            stateIndex: this.stateIndex
        };
    }
}

interface MultistrandConstraintStatus extends BaseConstraintStatus {
    unsatisfiedOligoIndexes: number[];
}

export class MultistrandBindingsConstraint extends BindingsConstraint<MultistrandConstraintStatus> {
    public static readonly NAME = 'BINDINGS';

    public evaluate(context: ConstraintContext): MultistrandConstraintStatus {
        let undoBlock = context.undoBlocks[this.stateIndex];
        if (context.targetConditions == null) {
            throw new Error('Target object not available for BINDINGS constraint');
        }

        let stateCondition = context.targetConditions[this.stateIndex];

        if (stateCondition == null) {
            throw new Error('Target condition not available for BINDINGS constraint');
        }

        const oligos: OligoDef[] = stateCondition['oligos'];
        if (oligos == null) {
            throw new Error('Target condition not available for BINDINGS constraint');
        }

        let oligoOrder = undoBlock.oligoOrder;
        // Unbound oligos are always at the end of the natural mode oligo order, so to know if it's bound according to
        // target mode ordering, check if its index in natural mode is less than the number bound
        let bindMap = Utility.range(oligoOrder.length).map(
            (targetIdx) => oligoOrder.indexOf(targetIdx) < undoBlock.oligosPaired
        );

        let unsatisfiedOligoIndexes = oligos.map(
            (oligoDef, index) => (
                (oligoDef['bind'] != null && oligoDef['bind'] !== bindMap[index]) ? index : -1)
        ).filter((val) => val !== -1);

        return {
            satisfied: unsatisfiedOligoIndexes.length === 0,
            unsatisfiedOligoIndexes
        };
    }

    protected _getOligoInfo(targetConditions: any[]): OligoInfo[] {
        const oligos: OligoDef[] = targetConditions[this.stateIndex]['oligos'];

        return oligos.map(
            (def, idx) => (def['bind'] != null ? {
                name: def['name'] || `Oligo ${(idx + 1).toString()}`,
                bind: Boolean(def['bind']),
                label: def['label'] || String.fromCharCode(65 + idx)
            } : null)
        ).filter((oligo) => oligo != null);
    }

    public getHighlight(
        status: MultistrandConstraintStatus,
        context: ConstraintContext
    ): HighlightInfo {
        let undoBlock = context.undoBlocks[this.stateIndex];
        const oligos: OligoDef[] = context.targetConditions[this.stateIndex]['oligos'];

        let highlightedIndices: number[] = [];
        // The + 1 is used to account for the "cut" base denoting split points between strands
        let oligoFirstBaseIndex = undoBlock.sequence.length + 1;
        for (let [idx, oligo] of oligos.entries()) {
            if (status.unsatisfiedOligoIndexes.includes(idx)) {
                highlightedIndices.push(oligoFirstBaseIndex, oligoFirstBaseIndex + oligo.sequence.length - 1);
            }
            oligoFirstBaseIndex += oligo.sequence.length + 1;
        }

        return {
            ranges: highlightedIndices,
            color: HighlightType.RESTRICTED,
            stateIndex: this.stateIndex
        };
    }

    public serialize(): [string, string] {
        return [
            BindingsConstraint.NAME,
            this.stateIndex.toString()
        ];
    }
}

export class OligoBoundConstraint extends BindingsConstraint<BaseConstraintStatus> {
    public static readonly NAME = 'OLIGO_BOUND';

    public evaluate(context: ConstraintContext): BaseConstraintStatus {
        let nnfe: number[] = context.undoBlocks[this.stateIndex]
            .getParam(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);

        if (context.targetConditions == null) {
            throw new Error('Target object not available for BINDINGS constraint');
        }

        let stateCondition = context.targetConditions[this.stateIndex];
        if (stateCondition == null) {
            throw new Error('Target condition not available for BINDINGS constraint');
        }

        return {
            satisfied: nnfe != null && nnfe[0] === -2
        };
    }

    public serialize(): [string, string] {
        return [
            OligoBoundConstraint.NAME,
            this.stateIndex.toString()
        ];
    }

    protected _getOligoInfo(targetConditions: any[]): OligoInfo[] {
        return [{
            name: targetConditions[this.stateIndex]['oligo_name'] || 'Oligo 1',
            label: targetConditions[this.stateIndex]['oligo_label'] || 'A',
            bind: true
        }];
    }
}

export class OligoUnboundConstraint extends BindingsConstraint<BaseConstraintStatus> {
    public static readonly NAME = 'OLIGO_UNBOUND';

    public evaluate(context: ConstraintContext): BaseConstraintStatus {
        let nnfe: number[] = context.undoBlocks[this.stateIndex]
            .getParam(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);

        if (context.targetConditions == null) {
            throw new Error('Target object not available for BINDINGS constraint');
        }

        let stateCondition = context.targetConditions[this.stateIndex];
        if (stateCondition == null) {
            throw new Error('Target condition not available for BINDINGS constraint');
        }

        return {
            satisfied: nnfe != null && nnfe[0] !== -2
        };
    }

    public serialize(): [string, string] {
        return [
            OligoBoundConstraint.NAME,
            this.stateIndex.toString()
        ];
    }

    protected _getOligoInfo(targetConditions: any[]): OligoInfo[] {
        return [{
            name: targetConditions[this.stateIndex]['oligo_name'] || 'Oligo 1',
            label: targetConditions[this.stateIndex]['oligo_label'] || 'A',
            bind: false
        }];
    }
}
