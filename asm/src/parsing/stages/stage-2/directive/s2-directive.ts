export interface S2Directive {
    // readonly tokenIndices: Array<number>;
    readonly hasParameter: boolean;

    /** The trimmed, lowercased text of the command itself. Does not include the question mark character. */
    readonly normalizedCommandName: string;

    /** The trimmed text of the receiver. */
    readonly normalizedReceiverName: string;

    /** The trimmed text of the parameter. */
    readonly normalizedParameter: string;

    readonly commandTokenIndices: Array<number>;
    readonly receiverTokenIndices: Array<number>;
    readonly parameterTokenIndices: Array<number>;
}