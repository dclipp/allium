import { FlagName } from '@allium/types';
import { ExecOutput, Mutator } from '@allium/arch';

export class AlmExecOutput implements ExecOutput {
    public readonly mutators: Array<Mutator>;
    public readonly flags: Array<FlagName>;

    public constructor(params?: {
        mutators?: Array<Mutator>,
        flags?: Array<FlagName>
    }) {
        this.mutators = new Array<Mutator>();
        this.flags = new Array<FlagName>();

        if (!!params) {
            if (!!params.mutators) {
                params.mutators.forEach(m => this.mutators.push(m));
            }
            if (!!params.flags) {
                params.flags.forEach(f => this.flags.push(f));
            }
        }
    }

    public duplicate(): ExecOutput {
        return new AlmExecOutput({
            mutators: this.mutators,
            flags: this.flags
        });
    }
}