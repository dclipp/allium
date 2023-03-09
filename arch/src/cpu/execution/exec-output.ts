import { FlagName } from '@allium/types';
import { Mutator } from './mutator';

export interface ExecOutput {
    readonly mutators: Array<Mutator>;
    readonly flags: Array<FlagName>;

    duplicate(): ExecOutput;
}
