export class Emscripten {
    /**
     * Instantiates a program from an Emscripten module and calls its main() function if it has one.
     * @returns {Promise<any>} a promise that will resolve with the instantiated module.
     */
    public static loadProgram (module: any): Promise<any> {
        return new Promise<any>((resolve, _) => {
            module.default({noInitialRun: true}).then((program: any) => {
                if (program.hasOwnProperty("callMain")) {
                    program.callMain();
                }

                // Fix an infinite loop.
                // "program" is not a promise, but since it has a 'then' property,
                // resolving our promise with the program will recurse infinitely.
                // https://github.com/kripken/emscripten/issues/5820
                // TODO: remove this if and when emscripten is fixed
                if (program.hasOwnProperty("then")) {
                    delete program["then"];
                }

                resolve(program);
            });
        });
    }
}