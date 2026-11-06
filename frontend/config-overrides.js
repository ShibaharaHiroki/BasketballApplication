const webpack = require('webpack');

// webpack 5 は Node コアモジュールのポリフィルを同梱しないため、ここで補う（Plotly.js などが利用）
module.exports = function override(config) {
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    assert: require.resolve('assert/'),
    buffer: require.resolve('buffer/'),
    stream: require.resolve('stream-browserify'),
    util: require.resolve('util/'),
    zlib: require.resolve('browserify-zlib'),
  };

  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  // ESM パッケージの拡張子なし import を許可する
  config.module.rules.push({
    test: /\.m?js$/,
    resolve: { fullySpecified: false },
  });

  // plotly.js の配布物に含まれない source map の警告を出さない
  config.ignoreWarnings = [...(config.ignoreWarnings || []), /Failed to parse source map/];

  return config;
};
