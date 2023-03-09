import { FlagName } from '@allium/types';

export interface FlagSet {
    readonly Overflow: boolean;
    readonly Underflow: boolean;
    readonly OutOfBounds: boolean;
    readonly RegisterSizeMismatch: boolean;
    readonly IORejection: boolean;
    readonly IllegalInstruction: boolean;
    readonly IllegalArgument: boolean;

    acknowledge(flagName: FlagName): boolean;
    raiseFlag(flagName: FlagName): void;
	
	readSilently(flagName: FlagName): boolean;
    clearSilently(flagName: FlagName): void;
    clearAllSilently(): void;
}
