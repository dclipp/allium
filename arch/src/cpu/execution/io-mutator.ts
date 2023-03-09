import { Mutator } from './mutator';
import { Byte, DynamicByteSequence } from '@allium/types';

export interface IoMutator extends Mutator {
    readonly port: Byte;
    readonly value: DynamicByteSequence;
}