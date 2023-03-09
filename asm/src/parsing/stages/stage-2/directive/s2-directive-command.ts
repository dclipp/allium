export interface S2DirectiveCommand {
    readonly tokenIndices: Array<number>;

    /** The trimmed, uppercased text of the command itself. Does not include the question mark character. */
    readonly normalizedCommandName: string;
}