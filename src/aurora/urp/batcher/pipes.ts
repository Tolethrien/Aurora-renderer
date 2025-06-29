import UnsortedDrawPipeline from "../pipelines/unsortedDrawPipe";
import PresentationPipe from "../pipelines/presentationPipe";
import Batcher from "./batcher";
import SortedDrawPipeline from "../pipelines/sortedDrawPipe";
import DebugTexturePipe from "../pipelines/debugTexturePipeline";

//TODO: przerobic ten plik caly jak bedzie wiecej pipow
export const DRAW_PIPES = {
  unsortedDraw: UnsortedDrawPipeline,
  sortedDraw: SortedDrawPipeline,
};
export const ALL_PIPES = [
  UnsortedDrawPipeline,
  SortedDrawPipeline,
  // PresentationPipe,
  DebugTexturePipe,
];
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
  Batcher.pipelinesUsedInFrame.forEach((name) =>
    DRAW_PIPES[name].usePipeline()
  );
  // PresentationPipe.usePipeline();
  DebugTexturePipe.usePipeline();
}
export function getDrawPipeline() {
  return Batcher.getBatcherOptions.sortOrder === "none"
    ? UnsortedDrawPipeline
    : SortedDrawPipeline;
}
