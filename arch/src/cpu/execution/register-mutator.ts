import { Mutator } from './mutator';
import { Register, RegisterMask } from '@allium/types';

export interface RegisterMutator extends Mutator {
    readonly register: Register;
    readonly mask: RegisterMask;
}
