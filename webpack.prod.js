/* eslint-disable import/no-extraneous-dependencies */

const { merge } = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  plugins: [
    new CleanWebpackPlugin(),
  ],
  output: {
    filename: '[name].[contenthash].js',
  },
});
