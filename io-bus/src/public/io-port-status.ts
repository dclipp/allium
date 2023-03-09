export enum IoPortStatus {
    /** No device attached */
    Null,

    /** Device attached, no read or write in any direction */
    Reserved,

    /** Can read and write in both directions */
    FullDuplex,

    /** Client can only write; Host can only read */
    ClientWritable,

    /** Client can only read; Host can only write */
    HostWritable
}