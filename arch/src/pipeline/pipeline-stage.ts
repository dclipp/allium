export enum PipelineStage {
    Decode = 0,
    Fetch,
    Execute,
    MemoryWriteBack,
    RegisterWriteBack,
    Done
}