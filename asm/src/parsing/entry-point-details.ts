import { InstructionReorderMap } from './shared/parser-types/instruction-reorder-map';

export interface EntryPointDetails {
    readonly objectName: string;
    readonly label: string;
    readonly instructionMap: InstructionReorderMap;
};