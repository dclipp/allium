import { Byte } from '@allium/types';
import { ExtendedAsmMessage } from '../messages/extended-asm-message';
import { AssemblyEntryPoint } from '../api-types/assembly-entry-point';

export interface CompiledAssembly {
    readonly succeeded: boolean;
    readonly messages: ReadonlyArray<ExtendedAsmMessage>;
    readonly programBytes: ReadonlyArray<Byte>;
    readonly objects: ReadonlyArray<{
        readonly succeeded: boolean;
        readonly objectName: string;
        readonly bytes: ReadonlyArray<Byte>;
    }>;
    // readonly entryPoint: {
    //     readonly objectName: string;
    //     readonly label: string;
    //     // readonly firstInstructionIndex: number;
    //     // readonly lastInstructionIndex: number;
    //     readonly indexRelocations: Map<number, number>;
    //     readonly postEntryIndexOffset: number;
    // };

    toFileContent(format: 'base10' | 'base16' | 'binary'): string;
}