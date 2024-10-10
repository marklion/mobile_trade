module.exports = {
    devServer: {
        open: true,
        hot: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            }
        }
    }
}