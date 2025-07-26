import PresentationPipe from "../pipelines/presentationPipe";
import DebugTexturePipe from "../pipelines/debugTexturePipeline";
import AuroraDebugInfo from "../debugger/debugInfo";
import LightsPipe from "../pipelines/lights";
import BloomPipeline from "../pipelines/bloomPipe";
import SortedDrawPipeline from "../pipelines/sortedDrawPipe";
import SequentialDrawPipeline from "../pipelines/sequentialDrawPipe";

export const ALL_PIPES = {
  SequentialDrawPipeline,
  SortedDrawPipeline,
  LightsPipe,
  BloomPipeline,
  PresentationPipe,
  DebugTexturePipe,
};

export async function createPipelines() {
  try {
    await Promise.all(
      Object.values(ALL_PIPES).map((pipe) => pipe.createPipeline())
    );
  } catch (error) {
    throw new Error(`error while creating pipelines: ${error}`);
  }
}
export function clearPipelines() {
  SortedDrawPipeline.clearPipeline();
  // SequentialDrawPipeline.clearPipeline();
  LightsPipe.clearBatch();
  BloomPipeline.clearBatch();
}
export function startPipelines() {
  SortedDrawPipeline.usePipeline();
  // SequentialDrawPipeline.usePipeline();
  LightsPipe.usePipeline();
  BloomPipeline.usePipeline();
  AuroraDebugInfo.isWorking
    ? DebugTexturePipe.usePipeline()
    : PresentationPipe.usePipeline();
}
export function getDrawPipeline() {
  return SortedDrawPipeline;
  // return SequentialDrawPipeline;
}
