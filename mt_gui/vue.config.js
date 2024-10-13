const fs = require('fs-extra');
const path = require('path')
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
    },
    chainWebpack: config => {
        config.plugin('check-changes')
            .use({
                apply: (compiler) => {
                    compiler.hooks.beforeRun.tapAsync('CheckChangesPlugin', (compilation, callback) => {
                        const vueFilesDir = path.resolve(__dirname, 'src');
                        const lastBuildFile = path.resolve(__dirname, 'last-build-time.txt');
                        let lastBuildTime = 0;

                        if (fs.existsSync(lastBuildFile)) {
                            lastBuildTime = fs.readFileSync(lastBuildFile, 'utf-8');
                        }

                        let filesChanged = false;
                        const checkFiles = (dir) => {
                            const files = fs.readdirSync(dir);
                            for (let file of files) {
                                const filePath = path.join(dir, file);
                                const stat = fs.statSync(filePath);

                                if (stat.isDirectory()) {
                                    checkFiles(filePath);
                                } else if (stat.mtimeMs > lastBuildTime) {
                                    filesChanged = true;
                                    break;
                                }
                            }
                        };

                        checkFiles(vueFilesDir);

                        if (!filesChanged) {
                            console.log('No relevant changes detected, skipping build.');
                            process.exit(0); // Exit the process to skip the build
                        } else {
                            fs.writeFileSync(lastBuildFile, Date.now().toString());
                        }

                        callback();
                    });
                }
            });
    }
}