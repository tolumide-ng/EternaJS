import {Application} from "pixi.js";
import {AppMode} from "../flashbang/core/AppMode";
import {FlashbangApp} from "../flashbang/core/FlashbangApp";
import {Background} from "./Background";

let vienna = require("./folding/engines/vienna");
let vrna2 = require("./folding/engines/vrna2");
let nupack = require("./folding/engines/nupack");

export class EternaApp extends FlashbangApp {
    protected createPixi (): Application {
        return new Application(1024, 768, {backgroundColor: 0x1099bb});
    }

    protected setup (): void {
        this._modeStack.pushMode(new TestMode());
    }
}

class FoldingTester {
    public constructor (name: string, engineFactory: any) {
        this._engineName = name;
        console.log(`[${this._engineName}] initializing...`);

        engineFactory({noInitialRun: true}).then((engine: any) => {
            this._engine = engine;

            if (engine.hasOwnProperty('callMain')) {
                console.log(`[${this._engineName}] main()`);
                engine.callMain();
            }

            console.log(`[${this._engineName}] initialized`);

            // http://www.eternagame.org/web/puzzle/8284172/
            const MINILOOP_SEQ = 'UAAAAAAG';
            const MINILOOP_STRUCT = '((....))';

            // http://www.eternagame.org/web/puzzle/13833/
            const SNOWFLAKE_SEQ = 'GUGGACAAGAUGAAACAUCAGUAACAAGCGCAAAGCGCGGGCAAAGCCCCCGGAAACCGGAAGUUACAGAACAAAGUUCAAGUUUACAAGUGGACAAGUUGAAACAACAGUUACAAGACGAAACGUCGGCCAAAGGCCCCAUAAAAUGGAAGUAACACUUGAAACAAGAAGUUUACAAGUUGACAAGUUCAAAGAACAGUUACAAGUGGAAACCACGCGCAAAGCGCCUCCAAAGGAGAAGUAACAGAAGAAACUUCAAGUUAGCAAGUGGUCAAGUACAAAGUACAGUAACAACAUCAAAGAUGGCGCAAAGCGCGAGCAAAGCUCAAGUUACAGAACAAAGUUCAAGAUUACAAGAGUGCAAGAAGAAACUUCAGAUAGAACUGCAAAGCAGCACCAAAGGUGGGGCAAAGCCCAACUAUCAGUUGAAACAACAAGUAUUCAAGAGGUCAAGAUCAAAGAUCAGUAACAAGUGCAAAGCACGGGCAAAGCCCGACCAAAGGUCAAGUUACAGUUCAAAGAACAAGAUUUC';

            const SNOWFLAKE_STRUCT = '((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))';

            this.FullFold('Miniloop', MINILOOP_SEQ, MINILOOP_STRUCT);
            this.FullFold('Snowflake', SNOWFLAKE_SEQ, SNOWFLAKE_STRUCT);
            this.FullFold('Snowflake', SNOWFLAKE_SEQ, SNOWFLAKE_STRUCT);
            console.log('Done!');
        });
    }

    private FullFold (name: string, seq: string, struct: string) {
        console.log(`[${this._engineName}] folding ${name}...`);

        let t0 = performance.now();
        let fullFoldResult = this._engine.FullFoldDefault(seq, struct);
        let t1 = performance.now();

        console.log(`[${this._engineName}] completed ${name}! (${t1 - t0}ms)`);

        fullFoldResult.delete();
    }

    private readonly _engineName: string;
    private _engine: any;
}

class TestMode extends AppMode {
    protected setup (): void {
        this.addObject(new Background(20, false), this.modeSprite);
        this._testers.push(
            new FoldingTester("vienna", vienna),
            new FoldingTester("vrna2", vrna2),
            new FoldingTester("nupack", nupack));
    }

    private _testers: FoldingTester[] = [];
}
