/* eslint-disable no-var, strict, prefer-arrow-callback */
'use strict';

let path = require('path');

let packageJson = require('./package.json');
let vendorDependencies = Object.keys(packageJson['dependencies']);

module.exports = {
    entry: {
        main: ['babel-polyfill', "./src/eterna/index.ts"],
        vendor: vendorDependencies
    },

    output: {
        filename: '[name].js',
        chunkFilename: '[chunkhash].js',
        path: path.resolve(__dirname + "/dist"),

        // TODO: We're not going to serve assets from 'dist' in production; fix this
        publicPath: "dist/"
    },

    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"]
    },

    module: {
        rules: [{
            // Include ts, tsx, and js files.
            test: /\.(tsx?)|(js)$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
        }],
    },

    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
    externals: {
        // "react": "React",
        // "react-dom": "ReactDOM"
    },

    // 5/15/18 - Cargo-culting this line in to fix 'Module not found: Error: Can't resolve 'fs''
    // https://github.com/webpack-contrib/css-loader/issues/447
    node: {
        fs: "empty"
    }
};
