import { S2Line } from '../s2-line';
import { S2Directive } from './s2-directive';

export interface S2DirectiveLine extends S2Line {
    readonly directiveIndex: number;
    readonly directive: S2Directive;
    // readonly directiveCommandTokenIndices: Array<number>;
    // readonly directiveReceiverTokenIndices: Array<number>;
    // readonly directiveParameterTokenIndices: Array<number>;
    // readonly hasParameter: boolean;
}

//?import c2b2=$ImportedCode2:Block02

// DirectiveIndex
// 		DirectiveCommand
// 		DirectiveParameter
// 			AssumedParameterKind
// 		HasParameter