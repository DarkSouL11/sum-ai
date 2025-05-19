const path = require('path');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: './src/background/index.ts',
  output: {
    path: path.resolve(__dirname, '../build/static/js'),
    filename: 'background.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                '@babel/preset-typescript',
              ],
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
}; 