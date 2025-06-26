import UnsortedDrawPipeline from "../pipelines/unsortedDrawPipe";
import PresentationPipe from "../pipelines/presentationPipe";
import Batcher from "./batcher";
import SortedDrawPipeline from "../pipelines/sortedDrawPipe";

//TODO: przerobic ten plik caly jak bedzie wiecej pipow
export const DRAW_PIPES = {
  unsortedDraw: UnsortedDrawPipeline,
  sortedDraw: SortedDrawPipeline,
};
export const ALL_PIPES = [
  UnsortedDrawPipeline,
  SortedDrawPipeline,
  PresentationPipe,
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
  console.log("s");
  Batcher.pipelinesUsedInFrame.forEach((name) =>
    DRAW_PIPES[name].usePipeline()
  );
  PresentationPipe.usePipeline();
}
export function getDrawPipeline() {
  return Batcher.getBatcherOptions.sortOrder === "none"
    ? UnsortedDrawPipeline
    : SortedDrawPipeline;
}
