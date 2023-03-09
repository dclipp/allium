import { FlagName } from '@allium/types';
import { FlagSet } from '@allium/arch';

export class AlmFlagSet implements FlagSet {
    private _flags = new Array<boolean>();

    public constructor() {
        const keys = Object.keys(FlagName);
        for (let i = 0; i < keys.length; i++) {
            this._flags.push(false);
        }
    }

    public get Overflow(): boolean {
        return this.checkFlagState(FlagName.Overflow);
    }
    public get Underflow(): boolean {
        return this.checkFlagState(FlagName.Underflow);
    }
    public get OutOfBounds(): boolean {
        return this.checkFlagState(FlagName.OutOfBounds);
    }
    public get RegisterSizeMismatch(): boolean {
        return this.checkFlagState(FlagName.RegisterSizeMismatch);
    }
    public get IORejection(): boolean {
        return this.checkFlagState(FlagName.IORejection);
    }
    public get IllegalInstruction(): boolean {
        return this.checkFlagState(FlagName.IllegalInstruction);
    }
    public get IllegalArgument(): boolean {
        return this.checkFlagState(FlagName.IllegalArgument);
    }

    public acknowledge(flagName: FlagName): boolean {
        const state = this.checkFlagState(flagName);
        this._flags[flagName.valueOf()] = false;
        return state;
    }

    public raiseFlag(flagName: FlagName): void {
        this._flags[flagName.valueOf()] = true;
    }
	
	public readSilently(flagName: FlagName): boolean {
		return this.checkFlagState(flagName);
	}
	
	public clearSilently(flagName: FlagName): void {
		this._flags[flagName.valueOf()] = false;
    }
    
    public clearAllSilently(): void {
        this._flags.forEach(f => {
            f = false;
        })
    }

    private checkFlagState(flagName: FlagName): boolean {
        return this._flags[flagName.valueOf()];
    }


}