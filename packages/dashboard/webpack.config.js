const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const cwd = process.cwd();

module.exports = {
  mode: "development",
  devtool: 'source-map',
  entry: './src/pages/index.jsx',
  output: {
    path: path.resolve(cwd, 'lib'),
    filename: 'index.js'
  },
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass'),
              sassOptions: {
                fiber: false,
              },
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.jsx|.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-react']
        }
      },
    ]
  },
  resolve: {
    alias: {
      "babel-runtime": path.resolve(cwd, 'node_modules/@babel/runtime'),
    },
    extensions: ['.js', '.jsx']
  },
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
    '@alifd/next': 'Next',
    'styled-components': 'styled',
    'moment': 'moment'
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: false,
      // filename: path.resolve(cwd, 'examples/public/index.html'),
      // eslint-disable-next-line no-unused-vars
      template: path.resolve(cwd, '/public/index.html')
    })
  ],
  devServer: {
    static: {
      directory: path.resolve(cwd, './public'),
    },
    compress: true,
    host: '127.0.0.1',
    port: 3000,
    // disableHostCheck: true
  }
};
