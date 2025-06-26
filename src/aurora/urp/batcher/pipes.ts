import PresentationPipe from "../pipelines/presentationPipe";
import ShapePipe from "../pipelines/shapePipe";
import TextPipe from "../pipelines/textPipe";
import WBOITPipe from "../pipelines/WBOITPipe";
import Batcher from "./batcher";

//TODO: przerobic ten plik caly jak bedzie wiecej pipow
export const DRAW_PIPES = {
  shape: ShapePipe,
  text: TextPipe,
};
export const ALL_PIPES = [ShapePipe, TextPipe, WBOITPipe, PresentationPipe];
export async function createPipelines() {
  try {
    await Promise.all(ALL_PIPES.map((pipe) => pipe.createPipeline()));
  } catch (error) {
    throw new Error(`error while creating pipelines: ${error}`);
  }
}
export function clearPipelines() {
  Batcher.pipelinesUsedInFrame.forEach((name) => DRAW_PIPES[name].clearBatch());
  Batcher.pipelinesUsedInFrame.clear();
}
export function startPipelines() {
  const isZSorted = Batcher.getBatcherOptions.zBuffer === "y";
  if (!isZSorted) {
    Batcher.pipelinesUsedInFrame.forEach((name) =>
      DRAW_PIPES[name].useUnsortedPipeline()
    );
  } else {
    Batcher.pipelinesUsedInFrame.forEach((name) =>
      DRAW_PIPES[name].useOpaquePipeline()
    );
    Batcher.pipelinesUsedInFrame.forEach((name) =>
      DRAW_PIPES[name].usePipeline("transparent")
    );
    WBOITPipe.usePipeline();
  }
  PresentationPipe.usePipeline();
}
