import {Graphics, Point, Sprite} from 'pixi.js';
import {Signal, UnitSignal} from 'signals';
import {DOMObject, DisplayObjectPointerTarget, TextBuilder} from 'flashbang';
import Eterna from 'eterna/Eterna';
import Fonts from 'eterna/util/Fonts';

/**
 * A text input object in the DOM. Floats on top of the PIXI canvas.
 * When it loses focus, it creates a fake text input display placeholder, and hides the DOM element.
 */
export default class TextInputObject extends DOMObject<HTMLInputElement | HTMLTextAreaElement> {
    public readonly valueChanged: Signal<string> = new Signal();
    public readonly keyPressed = new Signal<string>();

    constructor(fontSize: number, width = 100, rows = 1) {
        super(
            Eterna.OVERLAY_DIV_ID, rows === 1
                ? TextInputObject.createTextInput() : TextInputObject.createTextArea(rows)
        );

        this._fontSize = fontSize;
        this._rows = rows;

        this.width = width;
        this.font(Fonts.ARIAL);

        this._obj.style.fontSize = DOMObject.sizeToString(fontSize);
        this._obj.oninput = () => this.onInput();

        this._obj.onfocus = () => this.onFocusChanged(true);
        this._obj.onblur = () => this.onFocusChanged(false);
        this._obj.onkeypress = (e) => this.keyPressed.emit(e.key);
    }

    protected added(): void {
        super.added();

        // When our fakeTextInput is clicked, show and focus our real textInput
        new DisplayObjectPointerTarget(this._dummyDisp).pointerDown.connect(() => {
            if (this._fakeTextInput != null) {
                setTimeout(() => {
                    this.destroyFakeTextInput();
                    this._obj.style.visibility = 'visible';
                    this._obj.focus();
                });
            }
        });

        this._dummyDisp.interactive = false;

        if (this._showFakeTextInputWhenNotFocused) {
            this.onFocusChanged(this._hasFocus);
        }
    }

    private onFocusChanged(focused: boolean): void {
        this._hasFocus = focused;
        if (this.isLiveObject && this._showFakeTextInputWhenNotFocused) {
            if (focused) {
                this.destroyFakeTextInput();
            } else {
                this.createFakeTextInput();
            }
        }
    }

    protected updateElementProperties(): void {
        super.updateElementProperties();
        if (this._fakeTextInput != null) {
            this._obj.style.visibility = 'hidden';
        }
    }

    protected onSizeChanged(): void {
        super.onSizeChanged();
        if (this._fakeTextInput != null) {
            // recreate our fake text input when our properties change
            this.createFakeTextInput();
        }
    }

    /**
     * If true, the TextInput DOM element will be hidden when the TextInput doesn't have focus,
     * and a fake text input object will be show in its place. This allows the TextInputObject to play better
     * with WebGL: we can pretend that the object is properly layered in our scene, and use masks and whatnot.
     */
    public showFakeTextInputWhenNotFocused(value: boolean = true): TextInputObject {
        if (this._showFakeTextInputWhenNotFocused !== value) {
            this._showFakeTextInputWhenNotFocused = value;
            this.onFocusChanged(this._hasFocus);
        }
        return this;
    }

    /** Remove all input that matches the given regexp */
    public disallow(regexp: RegExp): TextInputObject {
        this._disallow = regexp;
        return this;
    }

    public font(fontFamily: string): TextInputObject {
        this._fontFamily = fontFamily;
        this._obj.style.fontFamily = fontFamily;
        this.onSizeChanged();
        return this;
    }

    public fontWeight(weight: string): TextInputObject {
        this._obj.style.fontWeight = weight;
        this.onSizeChanged();
        return this;
    }

    public bold(): TextInputObject {
        return this.fontWeight('bold');
    }

    public placeholderText(value: string): TextInputObject {
        this._obj.placeholder = value;
        return this;
    }

    public set readOnly(value: boolean) {
        this._obj.readOnly = value;
    }

    public setFocus(select: boolean = false): void {
        this._obj.focus();
        if (select) {
            this._obj.setSelectionRange(0, this._obj.value.length);
        }
    }

    public get width(): number {
        return this._obj.getBoundingClientRect().width;
    }

    public set width(value: number) {
        this._obj.style.width = DOMObject.sizeToString(value);
        this.onSizeChanged();
    }

    public get height(): number {
        return this._obj.getBoundingClientRect().height;
    }

    public get text(): string {
        return this._obj.value;
    }

    public set text(value: string) {
        this._obj.value = value;
        if (this._fakeTextInput != null) {
            // Recreate the text input since the text inside changed
            this.createFakeTextInput();
        }
    }

    public get caretPosition(): number {
        return this._obj.selectionStart === this._obj.selectionEnd ? this._obj.selectionStart : -1;
    }

    public get tabIndex(): number {
        return this._obj.tabIndex;
    }

    public set tabIndex(value: number) {
        this._obj.tabIndex = value;
    }

    private onInput(): void {
        if (this._disallow != null) {
            let curValue = this.text;
            this._obj.value = this._obj.value.replace(this._disallow, '');
            if (this.text !== curValue) {
                return;
            }
        }

        this.valueChanged.emit(this.text);
    }

    private destroyFakeTextInput(): void {
        if (this._fakeTextInput != null) {
            this._fakeTextInput.destroy({children: true});
            this._fakeTextInput = null;
            this._dummyDisp.interactive = false;
        }
    }

    private createFakeTextInput(): void {
        this.destroyFakeTextInput();

        this._dummyDisp.interactive = true;

        this._fakeTextInput = new Sprite();

        let bg = new Graphics()
            .lineStyle(1, 0x0)
            .beginFill(0xffffff)
            .drawRect(0, 0, this.width, this.height)
            .endFill();
        this._fakeTextInput.addChild(bg);

        let textMask = new Graphics().beginFill(0x0, 0).drawRect(0, 0, this.width, this.height).endFill();
        this._fakeTextInput.addChild(textMask);

        let displayText = this.text;
        let textColor = 0x0;
        if (displayText.length === 0) {
            displayText = this._obj.placeholder;
            // This color is probably browser dependent!
            textColor = 0x777777;
        }

        let text = new TextBuilder(displayText)
            .font(this._fontFamily)
            .fontSize(this._fontSize)
            .fontWeight(this._obj.style.fontWeight)
            .color(textColor)
            .wordWrap(this._rows > 1, this.width - 20)
            .hAlignLeft()
            .build();
        text.mask = textMask;
        text.position = new Point(
            parseFloat(window.getComputedStyle(this._obj, null).getPropertyValue('padding-left')),
            parseFloat(window.getComputedStyle(this._obj, null).getPropertyValue('padding-right'))
        );
        this._fakeTextInput.addChild(text);

        this._dummyDisp.addChild(this._fakeTextInput);
    }

    private static createTextArea(rows: number): HTMLTextAreaElement {
        let element = document.createElement('textarea');
        element.rows = rows;
        element.title = '';
        element.style.resize = 'none';
        element.style.overflow = 'scroll';
        return element;
    }

    private static createTextInput(): HTMLInputElement {
        let element = document.createElement('input');
        element.type = 'text';
        element.title = '';
        return element;
    }

    private readonly _fontSize: number;

    private _disallow: RegExp;
    private _fontFamily: string;
    private _rows: number;
    private _hasFocus: boolean;
    private _fakeTextInput: Sprite;
    private _showFakeTextInputWhenNotFocused: boolean = false;
}
