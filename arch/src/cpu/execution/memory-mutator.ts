import { Mutator } from './mutator';
import { Byte, QuadByte } from '@allium/types';

export interface MemoryMutator extends Mutator {
    readonly address: QuadByte;
    readonly newValue: Byte
}