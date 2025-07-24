import UnsortedDrawPipeline from "../pipelines/unsortedDrawPipe";
import PresentationPipe from "../pipelines/presentationPipe";
import Batcher from "./batcher";
import SortedDrawPipeline from "../pipelines/sortedDrawPipe";
import DebugTexturePipe from "../pipelines/debugTexturePipeline";
import AuroraDebugInfo from "../debugger/debugInfo";
import LightsPipe from "../pipelines/lights";
import BloomPipeline from "../pipelines/bloomPipe";

//TODO: przerobic ten plik caly jak bedzie wiecej pipow
export const DRAW_PIPES = {
  unsortedDraw: UnsortedDrawPipeline,
  sortedDraw: SortedDrawPipeline,
  // lights: LightsPipe,
};
export const ALL_PIPES = [
  UnsortedDrawPipeline,
  SortedDrawPipeline,
  LightsPipe,
  BloomPipeline,
  PresentationPipe,
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
  LightsPipe.clearBatch();
  BloomPipeline.clearBatch();
}
export function startPipelines() {
  Batcher.pipelinesUsedInFrame.forEach((name) =>
    DRAW_PIPES[name].usePipeline()
  );
  LightsPipe.usePipeline();
  BloomPipeline.usePipeline();
  AuroraDebugInfo.isWorking
    ? DebugTexturePipe.usePipeline()
    : PresentationPipe.usePipeline();
}
export function getDrawPipeline() {
  return Batcher.getConfigGroup("rendering").sortOrder === "none"
    ? UnsortedDrawPipeline
    : SortedDrawPipeline;
}
