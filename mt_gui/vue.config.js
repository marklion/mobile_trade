const fs = require('fs-extra');
const path = require('path')

const currentScript = process.env.npm_lifecycle_event;
module.exports = {
    transpileDependencies: ['uview-ui'],
    devServer: {
        open: true,
        hot: true,
        proxy: {
            '/api/v1/upload_file': {
                target: process.env.REMOTE_HOST,
                changeOrigin: true,
            },
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/uploads': {
                target: process.env.REMOTE_HOST,
                changeOrigin: true,
            },
            '/logo_res': {
                target: process.env.REMOTE_HOST,
                changeOrigin: true,
            },
        }
    },
    chainWebpack: config => {
        config.plugin('check-changes')
            .use({
                apply: (compiler) => {
                    compiler.hooks.beforeRun.tapAsync('CheckChangesPlugin', (compilation, callback) => {
                        const vueFilesDir = path.resolve(__dirname, 'src');
                        let build_target = currentScript.split(':').pop();
                        const lastBuildFile = path.resolve(__dirname, 'last-build-time-' + build_target + '.txt');
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
                                } else if (stat.mtimeMs > lastBuildTime && !filePath.endsWith('manifest.json')) {
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
        config
            .plugin('define')
            .tap(args => {
                let new_env = process.env;
                args[0]['process.env'].REMOTE_MOBILE_HOST = '"' + new_env.REMOTE_MOBILE_HOST + '"'
                args[0]['process.env'].REMOTE_HOST = '"' + new_env.REMOTE_HOST + '"'

                return args
            })
    }
}