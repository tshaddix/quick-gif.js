import GIFEncoder from "./util/GIFEncoder";
import { ITask, IFrameResult } from "./gif";

function renderFrame(task: ITask) {
  const encoder = new GIFEncoder(task.width, task.height);

  if (task.index === 0) {
    encoder.writeHeader();
  } else {
    encoder.firstFrame = false;
  }

  encoder.setTransparent(task.transparent);
  encoder.setDispose(task.dispose);
  encoder.setRepeat(task.repeat);
  encoder.setDelay(task.delay);
  encoder.setQuality(task.quality);
  encoder.setDither(task.dither);
  encoder.addFrame(task.data);

  if (frame.last) {
    encoder.finish();
  }

  const stream = encoder.stream();
  const pages = stream.pages;
  const cursor = stream.cursor;
  const pageSize = stream.constructor.pageSize;

  const result: IFrameResult = {
    ...task,
    pages,
    cursor,
    pageSize
  };

  if (task.canTransfer) {
    const transfer = Array.from(result.pages).map(page => page.buffer);
    self.postMessage(result, transfer);
  } else {
    self.postMessage(result);
  }
}

self.onmessage = function(event) {
  renderFrame(event.data);
};
