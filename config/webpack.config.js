const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WebpackBar = require('webpackbar');
const Dotenv = require('dotenv-webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  devtool: isDevelopment ? 'cheap-module-source-map' : false,
  
  entry: {
    popup: './src/index.tsx',
    background: './src/background/index.ts',
    content: './src/content/index.tsx',
    options: './src/options/index.tsx'
  },

  output: {
    path: path.resolve(__dirname, '../build'),
    filename: 'static/js/[name].js',
    clean: true
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
                '@babel/preset-typescript'
              ],
              plugins: [
                '@emotion/babel-plugin'
              ]
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/media/[name][ext]'
        }
      }
    ]
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, '../src')
    }
  },

  plugins: [
    new CleanWebpackPlugin(),
    new WebpackBar(),
    new Dotenv(),
    
    // Popup page
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      chunks: ['popup']
    }),

    // Options page
    new HtmlWebpackPlugin({
      template: './public/options.html',
      filename: 'options.html',
      chunks: ['options']
    }),

    // Copy manifest and other static files
    new CopyPlugin({
      patterns: [
        { 
          from: 'public/manifest.json',
          to: 'manifest.json',
          transform(content) {
            // Update the paths in manifest.json to match our output structure
            const manifest = JSON.parse(content);
            
            // Update background script path
            if (manifest.background?.service_worker) {
              manifest.background.service_worker = 'static/js/background.js';
            }
            
            // Update content script paths - only if they don't already have the prefix
            if (manifest.content_scripts) {
              manifest.content_scripts = manifest.content_scripts.map(script => ({
                ...script,
                js: script.js.map(js => js.startsWith('static/js/') ? js : `static/js/${js}`)
              }));
            }

            // Update icon paths
            if (manifest.icons) {
              manifest.icons = {
                "16": "static/media/logo16.png",
                "48": "static/media/logo48.png",
                "128": "static/media/logo128.png"
              };
            }

            // Update action icon paths
            if (manifest.action?.default_icon) {
              manifest.action.default_icon = {
                "16": "static/media/logo16.png",
                "48": "static/media/logo48.png",
                "128": "static/media/logo128.png"
              };
            }

            return JSON.stringify(manifest, null, 2);
          }
        },
        { from: 'public/rules.json' },
        { from: 'public/*.png', to: 'static/media/[name][ext]' }
      ]
    }),

    // Extract CSS in production
    ...(isDevelopment ? [] : [
      new MiniCssExtractPlugin({
        filename: 'static/css/[name].css'
      })
    ]),

    // Environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    })
  ],

  optimization: {
    minimize: !isDevelopment
  },
  stats: 'normal',
  infrastructureLogging: { level: 'info' }
}; 