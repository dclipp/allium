/** Specifies the method by which the internal clock is synchronized */
export enum ClockType {
    /**
     * Synchronizes cycle count with the number of cycles
     * expected given the machine's CPU speed, regardless
     * of the actual time elapsed between cycles.
    */
    Emulated,

    /**
     * Cycle count is incremented only after the completion
     * of a cycle. Note that the clock will not be
     * synchronized with the machine's CPU speed.
    */
    Real
}