import { PassOutput } from './pass-output';

export interface LocalPass extends PassOutput {
    readonly requiredExternalSymbols: Array<{
        readonly objectName: string;
        readonly symbol?: string;
    }>;
    readonly isEmptyObject: boolean;
}