/// <reference types="node" />
import { EventEmitter } from "events";
export declare enum RepeatTypes {
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
  imageData: Uint8ClampedArray;
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
  data: Uint8ClampedArray;
}
export interface IFrameResult extends ITask {
  pageSize: number;
  cursor: number;
  pages: any[];
}
export declare class GIF extends EventEmitter {
  private options;
  private width;
  private height;
  private isRunning;
  private isOpen;
  private activeWorkers;
  private freeWorkers;
  private frames;
  private nextFrame;
  private finishedFrames;
  private imageParts;
  private workerURL;
  constructor(width: number, height: number, options?: Partial<IOptions>);
  start(): void;
  addFrame(imageData: ImageData, frameOptions?: IFrameOptions): void;
  finish(): void;
  /**
   * Destroys all allocated resources
   * including spawned workers
   */
  destroy(): void;
  private render();
  private spawnWorkers();
  private onFrameFinished(result);
  private renderNextFrame();
  private finishRendering();
  private getTask(frame);
}
