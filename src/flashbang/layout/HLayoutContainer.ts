import {Rectangle, Sprite} from "pixi.js";
import {Align} from "../core/Align";
import {LayoutContainer} from "./LayoutContainer";

/**
 * A Container that arranges its children horizontally.
 * Call layout() after adding or removing children to update the sprite's layout.
 */
export class HLayoutContainer extends LayoutContainer {
    public constructor (hOffset: number = 0, vAlign: Align = Align.CENTER) {
        super();
        this._hOffset = hOffset;
        this._vAlign = vAlign;
    }

    public get reversed (): boolean {
        return this._reversed;
    }

    /** If true, then children are laid out right-to-left instead of left-to-right */
    public set reversed (val: boolean) {
        if (this._reversed != val) {
            this._reversed = val;
            this._needsLayout = true;
        }
    }

    public get hOffset (): number {
        return this._hOffset;
    }

    public set hOffset (val: number) {
        if (this._hOffset != val) {
            this._hOffset = val;
            this._needsLayout = true;
        }
    }

    public get vAlign (): Align {
        return this._vAlign;
    }

    public set vAlign (val: Align) {
        if (this._vAlign != val) {
            this._vAlign = val;
            this._needsLayout = true;
        }
    }

    public addHSpacer (size: number): void {
        this.addHSpacerAt(size, this.children.length);
    }

    public addHSpacerAt (size: number, index: number): void {
        let spacer = new Sprite();
        spacer.width = size;
        spacer.height = 1;
        spacer.alpha = 0;
        this.addChildAt(spacer, index);
    }

    /*override*/
    protected doLayout (): void {
        let maxHeight: number = 0;
        if (this._vAlign != Align.TOP) {
            for (let child of this.children) {
                if (child.visible) {
                    maxHeight = Math.max(child.getLocalBounds(HLayoutContainer.R).height, maxHeight);
                }
            }
        }

        let from: number, to: number, inc: number;
        if (this._reversed) {
            from = this.children.length - 1;
            to = -1;
            inc = -1;
        } else {
            from = 0;
            to = this.children.length;
            inc = 1;
        }

        let x: number = 0;
        for (let ii = from; ii != to; ii += inc) {
            let child = this.getChildAt(ii);
            if (child.visible) {
                child.x = 0;
                child.y = 0;
                let bounds: Rectangle = child.getLocalBounds(HLayoutContainer.R);
                child.x = -bounds.left + x;
                child.y = -bounds.top;
                if (this._vAlign == Align.CENTER) {
                    child.y += (maxHeight - bounds.height) * 0.5;
                } else if (this._vAlign == Align.BOTTOM) {
                    child.y += maxHeight - bounds.height;
                }

                x += bounds.width + this._hOffset;
            }
        }
    }

    protected _hOffset: number;
    protected _vAlign: Align;
    protected _reversed: boolean;

    protected static R: Rectangle = new Rectangle();
}