// import { Stage3Object } from '../stage-3/stage-3-object';
// import { S5InstructionArg } from './s5-instruction-arg';
// import { S3InstructionArg } from '../stage-3/instruction/s3-instruction-arg';

// export class S5AliasRefResolver {
//     public static tryResolve(instructionArg: S3InstructionArg, stage5Arg: S5InstructionArg, stage3: Stage3Object): S5InstructionArg | 'failed' {
//         const detail = instructionArg.asAliasRef();
        
//         const symbol = stage3.symbols.find(s => s.name === detail.aliasName);
//         if (!!symbol && symbol.value !== 'deferred') {
//             return {
//                 argNumber: stage5Arg.argNumber,
//                 isResolved: true,
//                 numericValue: symbol.value,
//                 tokenIndices: stage5Arg.tokenIndices
//             }
//         } else {
//             return 'failed';
//         }
//     }
// }