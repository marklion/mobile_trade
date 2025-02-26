const path = require('path')
const ESLintPlugin = require('eslint-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

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
    plugins: [
        new ESLintPlugin(), 
        new CopyPlugin({
            patterns: [
                {
                    // 源文件路径，这里指向 svg-captcha 库中的字体文件
                    from: path.resolve(__dirname, 'node_modules/svg-captcha/fonts/Comismsh.ttf'),
                    // 目标路径，这里是 build 目录下的 fonts 子目录
                    to: path.resolve(__dirname, 'build/fonts')
                }
            ]
    })],
    devtool: 'source-map',
}