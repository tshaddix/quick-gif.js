module.exports = {
  entry: "./example/src/example.js",

  output: {
    filename: "example.js",
    path: __dirname + "/dist/"
  },

  // Enable sourcemaps for debugging webpack's output.
  devtool: "source-map",

  resolve: {
    extensions: [".js", ".json"]
  },

  module: {
    rules: []
  }
};
