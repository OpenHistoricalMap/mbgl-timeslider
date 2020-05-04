const ExtractTextPlugin = require("extract-text-webpack-plugin");
const StringReplacePlugin = require("string-replace-webpack-plugin");

module.exports = {
    entry: {
        index: './mbgl-control-timeslider-control.js',
    },
    output: {
        path: __dirname + '/dist/',
        filename: 'mbgl-control-timeslider.js',
        // allow the export (which itself is a namespace object) into the global namespace
        libraryTarget: 'var',
        library: 'TimeSlider'
    },

    module: {
        loaders: [
            /*
             * Plain JS files
             * just kidding; Webpack already does those without any configuration  :)
             * but we do not want to lump them in with ES6 files: they would be third-party and then run through JSHint and we can't waste time linting third-party JS
             */

            /*
             * run .js6 files through Babel + ES-ENV via loader; lint and transpile into X.js
             * that's our suffix for ECMAScript 2015 / ES6 files
             */
            {
                test: /\.js$/,
                use: [
                    { loader: 'babel-loader', options: { presets: ['env'] } },
                    { loader: 'jshint-loader', options: { esversion: 6, emitErrors: true, failOnHint: true } }
                ],
                exclude: /node_modules/
            },

            /*
             * CSS files and also SASS-to-CSS all go into one bundled X.css
             */
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    use: [
                        { loader: 'css-loader', options: { minimize: true, sourceMap: true, url: false } }
                    ],
                    fallback: 'style-loader'
                })
            },
            {
                test: /\.scss$/,
                use: ExtractTextPlugin.extract({
                    use: [
                        { loader: 'css-loader', options: { minimize: true, sourceMap: true, url: false } },
                        { loader: 'sass-loader', options: { sourceMap:true } },
                    ],
                    fallback: 'style-loader'
                })
            }
        ]
    },


    /*
     * enable source maps, applicable to both JS and CSS
     */
    devtool: "nosources-source-map",

    /*
     * plugins for the above
     */
    plugins: [
        // CSS output from the CSS + LESS handlers above
        new ExtractTextPlugin({
            disable: false,
            filename: 'mbgl-control-timeslider.css'
        }),
        // for doing string replacements on files
        new StringReplacePlugin(),
    ],

    /*
     * plugins for the above
     */
    devServer: {
      contentBase: '.',
      port: 9000
    }
};
