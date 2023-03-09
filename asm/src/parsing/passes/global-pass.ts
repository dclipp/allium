import { QuadByte } from '@allium/types';
import { PassOutput } from './pass-output';

export interface GlobalPass extends PassOutput {
    readonly baseAddress: QuadByte;
    readonly tailAddress: QuadByte;

    // readonly publicSymbols: Array<{
    //     readonly symbolName: string;
    //     readonly symbol?: string;
    // }>;
}