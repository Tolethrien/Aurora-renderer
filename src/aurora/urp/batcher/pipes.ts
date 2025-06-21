import PresentationPipe from "../pipelines/presentationPipe";
import ShapePipe from "../pipelines/shapePipe";
import TextPipe from "../pipelines/textPipe";
import WBOITPipe from "../pipelines/WBOITPipe";
import Batcher from "./batcher";

export interface Pipeline {
  usePipeline: () => void;
  createPipeline: () => void;
  clearBatch: () => void;
}
export const DRAW_PIPES = {
  shape: ShapePipe,
  text: TextPipe,
};
export async function createPipelines() {
  try {
    await Promise.all(
      Object.values(DRAW_PIPES).map((pipeline) => pipeline.createPipeline())
    );
    await WBOITPipe.createPipeline();
    await PresentationPipe.createPipeline();
  } catch (error) {
    throw new Error(`error while creating pipelines: ${error}`);
  }
}
export function clearPipelines() {
  Batcher.pipelinesUsedInFrame.forEach((name) => DRAW_PIPES[name].clearBatch());
  Batcher.pipelinesUsedInFrame.clear();
}
export function startPipelines() {
  Batcher.pipelinesUsedInFrame.forEach((name) =>
    DRAW_PIPES[name].usePipeline("opaque")
  );
  Batcher.pipelinesUsedInFrame.forEach((name) =>
    DRAW_PIPES[name].usePipeline("transparent")
  );
  WBOITPipe.usePipeline();
  PresentationPipe.usePipeline();
}
