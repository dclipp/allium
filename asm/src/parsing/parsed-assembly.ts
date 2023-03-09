import { GlobalPass } from './passes/global-pass';
import { ParseOptions } from './parse-options';
import { ExtendedAsmMessage } from '../messages/extended-asm-message';
import { EntryPointDetails } from './entry-point-details';

export interface ParsedAssembly {
    readonly globalPasses: Array<GlobalPass>;
    readonly messages: Array<ExtendedAsmMessage>;
    readonly succeeded: boolean;
    readonly parserOptionsUsed: ParseOptions;
    readonly entryPoint: EntryPointDetails;
}