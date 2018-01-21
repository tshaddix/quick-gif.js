const { GIF } = require("../../lib/index");

window.onload = function() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const img = document.getElementById("img");

  const width = 350;
  const height = 350;

  const frameRate = 5;

  video.width = canvas.width = img.width = width;
  video.height = canvas.height = img.height = height;

  var gif = new GIF(width, height, {
    workers: 2,
    quality: 10
  });

  const frameInterval = setInterval(() => {
    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0);

    gif.addFrame(ctx.getImageData(0, 0, width, height), {
      delay: 1000 / frameRate
    });
  }, 1000 / frameRate);

  let renderStart = 0;

  video.onended = function() {
    clearInterval(frameInterval);
    gif.finish();

    renderStart = Date.now();
  };

  gif.on("finished", function(blob) {
    img.src = URL.createObjectURL(blob);
    alert(`post-render time: ${(Date.now() - renderStart) / 1000}`);
    gif.destroy();
  });

  gif.start();

  video.src = "assets/small.webm";
  video.play();
};
