const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      xeditor: './src/index.ts'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].min.js' : '[name].js',
      library: {
        name: 'XEditor',
        type: 'umd',
        export: 'default'
      },
      globalObject: 'this'
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@core': path.resolve(__dirname, 'src/core'),
        '@plugins': path.resolve(__dirname, 'src/plugins'),
        '@ui': path.resolve(__dirname, 'src/ui'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@styles': path.resolve(__dirname, 'src/styles')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env']
              }
            },
            'ts-loader'
          ],
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        },
        {
          test: /\.(png|jpg|gif|svg)$/,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      new CleanWebpackPlugin(),
      new MiniCssExtractPlugin({
        filename: isProduction ? '[name].min.css' : '[name].css'
      }),
      ...(isProduction ? [] : [
        new HtmlWebpackPlugin({
          template: './demo/index.html',
          filename: 'index.html'
        })
      ])
    ],
    optimization: {
      minimize: isProduction,
      minimizer: [new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true
          }
        }
      })]
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'demo')
      },
      compress: true,
      port: 8080,
      hot: true,
      open: true
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map'
  };
};