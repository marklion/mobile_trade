const path = require('path')
const ESLintPlugin = require('eslint-webpack-plugin');
module.exports = {
    target: "node",
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'build/api'),
        filename: 'index.js'
    },
    resolve: {
        modules: ['node_modules', path.resolve(__dirname, 'node_modules')],
    },
    externals: {
        "/usr/local/lib/node_modules/sqlite3": "commonjs /usr/local/lib/node_modules/sqlite3",
	},
    mode: 'development',
    plugins: [new ESLintPlugin()],
}