import EventEmitter from "events";
import browser from "util/browser";

const workerSrc = require("raw-loader!./raw/gif.worker.js");

// create a worker blob to hold the worker
// src code
const workerBlob = new Blob([workerSrc]);

export enum RepeatTypes {
  Forever = 0,
  Once = -1
}

export interface IOptions {
  workers: number;
  repeat: RepeatTypes;
  background: string;
  quality: number;
  transparent: string | null;
  dither: string | null;
  frameOptions: IFrameOptions;
}

export interface IFrameOptions {
  delay: number;
  dispose: number;
}

export interface IFrame extends IFrameOptions {
  imageData: ImageData;
  transparent: string | null;
}

export interface ITask {
  index: number;
  last: boolean;
  delay: number;
  dispose: number;
  transparent: string | null;
  width: number;
  height: number;
  quality: number;
  dither: string | null;
  repeat: RepeatTypes;
  canTransfer: boolean;
  data: ImageData;
}

export interface IFrameResult extends ITask {
  pageSize: number;
  cursor: number;
  pages: any[];
}

export class GIF extends EventEmitter {
  private options: IOptions = {
    workers: 2,
    repeat: RepeatTypes.Forever,
    quality: 10,
    background: "#fff",
    transparent: null,
    dither: null,
    frameOptions: {
      delay: 500,
      dispose: -1
    }
  };
  private width: number;
  private height: number;
  private isRunning: boolean = false;
  private isOpen: boolean = true;
  private activeWorkers: Worker[] = [];
  private freeWorkers: Worker[] = [];
  private frames: IFrame = [];
  private nextFrame: number = 0;
  private finishedFrames: number = 0;
  private imageParts: (IFrameResult | null)[] = [];
  private workerURL: string | null = null;

  constructor(width: number, height: number, options?: Partial<IOptions>) {
    super();

    this.width = width;
    this.height = height;

    this.options = {
      ...this.options,
      options
    };

    // bind handlers / methods
    this.start = this.start.bind(this);
    this.addFrame = this.addFrame.bind(this);
    this.destroy = this.destroy.bind(this);
    this.render = this.render.bind(this);
    this.spawnWorkers = this.spawnWorkers.bind(this);
    this.onFrameFinished = this.onFrameFinished.bind(this);
    this.renderNextFrame = this.renderNextFrame.bind(this);
    this.finishRendering = this.finishRendering.bind(this);
    this.getTask = this.getTask.bind(this);
  }

  public start(): void {
    if (this.isRunning) {
      throw new Error("Already running");
    }

    this.isRunning = true;
    this.isOpen = true;
    this.nextFrame = 0;
    this.finishedFrames = 0;
    this.workerURL = URL.getObjectURL(workerBlob);
    this.spawnWorkers();
  }

  public addFrame(imageDate: ImageData) {
    if (!this.isOpen) {
      throw new Error("Can not add frame - the renderer has been closed");
    }

    const frame: IFrame = {
      ...this.frameOptions,
      transparent: this.options.transparent,
      imageData
    };

    frames.push(frame);
    imageParts.push(null);

    this.render();
  }

  public finish(): void {
    this.isOpen = false;

    this.render();
  }

  /**
   * Destroys all allocated resources
   * including spawned workers
   */
  public destroy(): void {
    this.isRunning = false;
    this.isOpen = true;
    this.nextFrame = 0;
    this.finishedFrames = 0;

    // terminate all the workers
    this.activeWorkers.concat(this.freeWorkers).forEach(worker => {
      worker.terminate();
    });

    this.activeWorkers = [];
    this.freeWorkers = [];

    // revoke worker blob url
    URL.revokeObjectURL(this.workerURL);
    this.workerURL = null;
  }

  private render() {
    // no free workers
    if (!this.freeWorkers.length) {
      return;
    }

    const allFramesRendered = this.nextFrame > this.frames.length;

    if (!allFramesRendered) {
      this.renderNextFrame();
    } else if (!this.isOpen) {
      this.finishRendering();
    } else {
      return;
    }
  }

  private spawnWorkers(): number {
    const numWorkers = this.workers - this.freeWorkers.length;
    let w = 0;

    while (w < numWorkers) {
      const worker = new Worker(this.workerURL);

      worker.onmessage = event => {
        // remove worker from active workers
        this.activeWorkers.splice(this.activeWorkers.indexOf(worker), 1);
        this.freeWorkers.push(worker);
        this.onFrameFinished(event.data);
      };

      this.freeWorkers.push(worker);

      w++;
    }

    return numWorkers;
  }

  private onFrameFinished(result: IFrameResult): void {
    this.finishedFrames++;
    this.imageParts[result.index] = result;

    this.render();
  }

  private renderNextFrame(): void {
    // renderNextFrame should not be called if there are no free workers
    if (!this.freeWorkers.length) {
      throw new Error("No free workers to process next frame");
    }

    if (this.nextFrame >= this.frames.length) {
      // error?
      return;
    }

    const frame = this.frames[this.nextFrame];
    this.nextFrame++;
    const worker = this.freeWorkers.shift();
    const task: ITask = this.getTask(frame);

    this.activeWorkers.push(worker);

    worker.postMessage(task);
  }

  private finishRendering(): void {
    let len = 0;

    this.imageParts.forEach(result => {
      len += (result.pages.length - 1) * result.pageSize + result.cursor;
    });

    len += result.pageSize - result.cursor;

    const data = new Uint8Array(len);
    let offset = 0;

    this.imageParts.forEach(result => {
      result.pages.forEach((page, i) => {
        data.set(page, offset);

        if (i === result.pages.length - 1) {
          offset == result.cursor;
        } else {
          offset += result.pageSize;
        }
      });
    });

    const image = new Blob(data, { type: "image/gif" });

    this.emit("finished", image, data);

    this.isRunning = false;
  }

  private getTask(frame: IFrame): ITask {
    const { options } = this;

    const index = this.frames.indexOf(frame);
    const task: ITask = {
      index,
      last: index === this.frames.length - 1 && !this.isOpen,
      delay: frame.delay,
      dispose: frame.dispose,
      transparent: frame.transparent,
      width: this.width,
      height: this.height,
      quality: options.quality,
      dither: options.dither,
      repeat: options.repeat,
      canTransfer: browser.name === "chrome",
      data: frame.data
    };

    return task;
  }
}
