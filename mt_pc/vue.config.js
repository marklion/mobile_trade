'use strict'
const path = require('path')
const defaultSettings = require('./src/settings.js')
const fs = require('fs-extra');

function resolve(dir) {
  return path.join(__dirname, dir)
}

const name = defaultSettings.title || 'vue Admin Template' // page title

// If your port is set to 80,
// use administrator privileges to execute the command line.
// For example, Mac: sudo npm run
// You can change the port by the following methods:
// port = 9528 npm run dev OR npm run dev --port = 9528
const port = process.env.port || process.env.npm_config_port || 9528 // dev port

// All configuration item explanations can be find in https://cli.vuejs.org/config/
module.exports = {
  /**
   * You will need to set publicPath if you plan to deploy your site under a sub path,
   * for example GitHub Pages. If you plan to deploy your site to https://foo.github.io/bar/,
   * then publicPath should be set to "/bar/".
   * In most cases please use '/' !!!
   * Detail: https://cli.vuejs.org/config/#publicpath
   */
  publicPath: '/',
  outputDir: 'build/mt_pc',
  assetsDir: 'static',
  lintOnSave: process.env.NODE_ENV === 'development',
  productionSourceMap: false,
  devServer: {
    port: port,
    open: true,
    hot: true,
    overlay: {
      warnings: false,
      errors: true
    },
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
  configureWebpack: {
    // provide the app's title in webpack's name field, so that
    // it can be accessed in index.html to inject the correct title.
    name: name,
    resolve: {
      alias: {
        '@': resolve('src')
      }
    }
  },
  chainWebpack(config) {
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
    // it can improve the speed of the first screen, it is recommended to turn on preload
    config.plugin('preload').tap(() => [
      {
        rel: 'preload',
        // to ignore runtime.js
        // https://github.com/vuejs/vue-cli/blob/dev/packages/@vue/cli-service/lib/config/app.js#L171
        fileBlacklist: [/\.map$/, /hot-update\.js$/, /runtime\..*\.js$/],
        include: 'initial'
      }
    ])

    // when there are many pages, it will cause too many meaningless requests
    config.plugins.delete('prefetch')

    // set svg-sprite-loader
    config.module
      .rule('svg')
      .exclude.add(resolve('src/icons'))
      .end()
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(resolve('src/icons'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
      .end()

    // set preserveWhitespace
    config.module
      .rule('vue')
      .use('vue-loader')
      .loader('vue-loader')
      .tap(options => {
        options.compilerOptions.preserveWhitespace = true
        return options
      })
      .end()

    config
      .when(process.env.NODE_ENV !== 'development',
        config => {
          config
            .plugin('ScriptExtHtmlWebpackPlugin')
            .after('html')
            .use('script-ext-html-webpack-plugin', [{
              // `runtime` must same as runtimeChunk name. default is `runtime`
              inline: /runtime\..*\.js$/
            }])
            .end()
          config
            .optimization.splitChunks({
              chunks: 'all',
              cacheGroups: {
                libs: {
                  name: 'chunk-libs',
                  test: /[\\/]node_modules[\\/]/,
                  priority: 10,
                  chunks: 'initial' // only package third parties that are initially dependent
                },
                elementUI: {
                  name: 'chunk-elementUI', // split elementUI into a single package
                  priority: 20, // the weight needs to be larger than libs and app or it will be packaged into libs or app
                  test: /[\\/]node_modules[\\/]_?element-ui(.*)/ // in order to adapt to cnpm
                },
                commons: {
                  name: 'chunk-commons',
                  test: resolve('src/components'), // can customize your rules
                  minChunks: 3, //  minimum common number
                  priority: 5,
                  reuseExistingChunk: true
                }
              }
            })
          // https:// webpack.js.org/configuration/optimization/#optimizationruntimechunk
          config.optimization.runtimeChunk('single')
          config
            .plugin('define')
            .tap(args => {
              let new_env = process.env;
              args[0]['process.env'].REMOTE_MOBILE_HOST = '"' + new_env.REMOTE_MOBILE_HOST + '"'
              args[0]['process.env'].REMOTE_HOST = '"' + new_env.REMOTE_HOST + '"'

              return args
            })
        }
      )
  }
}
