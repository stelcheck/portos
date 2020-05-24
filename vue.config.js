const webpack = require('webpack')

module.exports = {
  configureWebpack: {
    plugins: [
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery'
      })
    ]
  },
  pluginOptions: {
    electronBuilder: {
      build: {
        win: {
          requestedExecutionLevel: 'requireAdministrator',
          signAndEditExecutable: false
        }
      }
    }
  }
}
