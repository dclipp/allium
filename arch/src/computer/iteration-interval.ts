/** Specifies the scope of work that will be performed within an iteration */
export enum IterationInterval {
    /** A single pipeline stage will be completed */
    PipelineStage,

    /** Each stage of the pipeline will be completed */
    PipelineCycle
}