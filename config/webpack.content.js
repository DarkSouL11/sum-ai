const path = require('path');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: './src/content/index.tsx',
  output: {
    path: path.resolve(__dirname, '../build/static/js'),
    filename: 'content.js',
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                '@babel/preset-react',
                '@babel/preset-typescript',
              ],
              plugins: ['@emotion/babel-plugin']
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
}; 