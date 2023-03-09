import { SerializedIoChannel } from './serialized-io-channel';

export interface SerializedIoInstallation {
    readonly input: SerializedIoChannel | null;
    readonly output: SerializedIoChannel | null;
    readonly title: string;
    // readonly log: Array<{ readonly timestamp: number, readonly entry: string }>;
    // readonly hooks: 
}