module.exports = {
  entry: "./src/index.ts",

  output: {
    filename: "index.js",
    path: __dirname + "/lib/",
    library: "Quick-Gif.js",
    libraryTarget: "umd"
  },

  // Enable sourcemaps for debugging webpack's output.
  devtool: "source-map",

  resolve: {
    // Add '.ts' as resolvable extensions.
    extensions: [".ts", ".js", ".json"]
  },

  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
      { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
    ]
  }
};
