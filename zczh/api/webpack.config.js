const path = require('path')
const fs = require('fs-extra');

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
    plugins: [{
        apply: (compiler) => {
            compiler.hooks.beforeRun.tapAsync('CheckChangesPlugin', (compilation, callback) => {
                const vueFilesDir = path.resolve(__dirname);
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
                        } else if (stat.mtimeMs > lastBuildTime &&
                            path.resolve(filePath) != path.resolve(lastBuildFile) &&
                            !filePath.endsWith('package-lock.json')) {
                            filesChanged = true;
                            console.log(filePath);
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
    }],

}