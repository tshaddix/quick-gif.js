# quick-gif.js

A simple and quick gif encoding library in JavaScript for the browser. Heavily inspired by [https://github.com/jnordberg/gif.js](https://github.com/jnordberg/gif.js).

## Installation

```
npm install --save quick-gif.js
```

## Usage

This library is slightly different than other browser-based GIF encoders. Instead of collecting all the frames and waiting until the end of the media to start processing, `quick-gif.js` will start processing frames as soon as it is receiving them. This is where the `quick` comes from in the name.

```js
// import the GIF class
import { GIF } from "quick-gif.js";

// create a new GIF instance
var gif = new GIF(width, height, {
  workers: 2, // will spawn 2 web workers
  quality: 10 // quality of the render - the lower the better
});

// As you are rendering via a canvas, you can
// call the `addFrame` with the image data (ctx.getImageData())
// as soon as you write a new frame. As soon as you do this,
// the renderer will begin converting that frame for the resulting gif
function onNewFrame(imageData) {
  gif.addFrame(imageData, {
    delay: 1000 / 30 // 30 fps
  });
}

// Once you are done streaming media, you can
// tell the renderer that you are finished sending frames
// and allow it to finish up
function onVideoFinished() {
  gif.finish();
}

// finished will be emitted once all the frames have been processed
// and compiled into a gif
gif.on("finished", function(blob) {
  window.open(URL.createObjectURL(blob));

  // you want to make sure and free up the resources
  // used by the renderer once you're done
  gif.destroy();
});

// Calling start will kick the renderer off
// and allocate resources for all frames
gif.start();
```

You can see a working example in [/example]("./blob/master/example").

## Note

Building GIFs in your browser is pretty memory intensive. If your task is too large (high frame rate / long video / etc) you may crash your window.
