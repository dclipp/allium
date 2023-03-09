import { AssemblySourceMap } from './source-map/assembly-source-map';
import { ExtendedAsmMessage } from '../messages/extended-asm-message';
import { CompiledAssembly } from '../compilation/compiled-assembly';

export interface Assembly {
    readonly buildSucceeded: boolean;
    readonly messages: Array<ExtendedAsmMessage>;

    readonly totalByteCount: number;
    readonly compilation: CompiledAssembly;

    readonly sourceMap?: AssemblySourceMap;
}