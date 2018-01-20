/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let now;
const { NeuQuant } = require("./TypedNeuQuant.js");

/*
typed 100 runs:
  run finished at q1
  avg: 661.46ms median: 660.54ms
  run finished at q10
  avg: 67.49ms median: 67.03ms
  run finished at q20
  avg: 34.56ms median: 34.19ms
normal 100 runs:
  run finished at q1
  avg: 888.10ms median: 887.63ms
  run finished at q10
  avg: 92.85ms median: 91.99ms
  run finished at q20
  avg: 46.14ms median: 45.68ms
*/

const quality = 10; // pixel sample interval, 1 being the best quality
const runs = 100;

if ((window.performance != null ? window.performance.now : undefined) != null) {
  now = () => window.performance.now();
} else {
  ({ now } = Date);
}

window.addEventListener("load", function() {
  let i, imgq;
  let end1;
  const img = document.getElementById("image");
  const canvas = document.getElementById("canvas");

  const w = (canvas.width = img.width);
  const h = (canvas.height = img.height);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imdata = ctx.getImageData(0, 0, img.width, img.height);
  const rgba = imdata.data;

  const rgb = new Uint8Array(w * h * 3);
  //rgb = new Array w * h * 3

  let rgb_idx = 0;
  for (i = 0, end1 = rgba.length; i < end1; i += 4) {
    rgb[rgb_idx++] = rgba[i + 0];
    rgb[rgb_idx++] = rgba[i + 1];
    rgb[rgb_idx++] = rgba[i + 2];
  }

  const runtimes = [];
  for (
    let run = 0, end2 = runs, asc = 0 <= end2;
    asc ? run < end2 : run > end2;
    asc ? run++ : run--
  ) {
    const start = now();
    imgq = new NeuQuant(rgb, quality);
    imgq.buildColormap();
    const end = now();
    const delta = end - start;
    runtimes.push(delta);
  }

  console.log(runtimes.join("\n"));

  const map = imgq.getColormap();
  const avg = runtimes.reduce((p, n) => p + n) / runtimes.length;
  const median = runtimes.sort()[Math.floor(runs / 2)];
  console.log(`\
run finished at q${quality}
avg: ${avg.toFixed(2)}ms median: ${median.toFixed(2)}ms\
`);

  for (
    let y = 0, end3 = h, asc1 = 0 <= end3;
    asc1 ? y < end3 : y > end3;
    asc1 ? y++ : y--
  ) {
    for (
      let x = 0, end4 = w, asc2 = 0 <= end4;
      asc2 ? x < end4 : x > end4;
      asc2 ? x++ : x--
    ) {
      const idx = (y * w + x) * 4;

      const r = rgba[idx + 0];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];

      const map_idx = imgq.lookupRGB(r, g, b) * 3;

      rgba[idx + 0] = map[map_idx];
      rgba[idx + 1] = map[map_idx + 1];
      rgba[idx + 2] = map[map_idx + 2];
    }
  }

  ctx.putImageData(imdata, 0, 0);

  return (() => {
    let end5;
    const result = [];
    for (i = 0, end5 = map.length; i < end5; i += 3) {
      const color = [map[i], map[i + 1], map[i + 2]];
      const el = document.createElement("span");
      el.style.display = "inline-block";
      el.style.height = "1em";
      el.style.width = "1em";
      el.style.background = `rgb(${color.join(",")})`;
      result.push(document.body.appendChild(el));
    }
    return result;
  })();
});
