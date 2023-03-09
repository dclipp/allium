// import { Stage3Object } from '../stage-3/stage-3-object';
// import { Stage4Object } from '../stage-4/stage-4-object';
// import { PassDetails } from '../../shared/parser-types/pass-details';
// import { S5InstructionArg } from './s5-instruction-arg';
// import { DirectiveCommand } from '../../shared/directive/directive-command';
// import { S3InstructionArg } from '../stage-3/instruction/s3-instruction-arg';
// import { ByteSequenceCreator, DynamicByteSequence, QuadByte, INSTRUCTION_BYTE_COUNT } from '@allium/types';
// import { DirectiveParameterValueResolver } from '../../shared/directive/directive-parameter-value-resolver';
// import { PassScope } from '../../passes/pass-scope';

// export class S5PossibleAliasResolver {
//     public static tryResolve(instructionArg: S3InstructionArg, stage5Arg: S5InstructionArg,
//         stage3: Stage3Object, stage4: Stage4Object, passDetails: PassDetails): S5InstructionArg | 'failed' {
//         const detail = instructionArg.asAliasRef();
        
//         let result: S5InstructionArg | 'failed' = S5PossibleAliasResolver.tryFromAliasDirective(
//             detail.directiveReceiverName, stage5Arg, stage3, stage4, passDetails);
//         if (result === 'failed') {
//             result = S5PossibleAliasResolver.tryFromImportDirective(detail.directiveReceiverName, stage5Arg, stage3, passDetails);
//         }

//         return result;
//     }

//     private static tryFromImportDirective(directiveReceiverName: string, stage5Arg: S5InstructionArg,
//         stage3: Stage3Object, passDetails: PassDetails): S5InstructionArg | 'failed' {
//         let result: S5InstructionArg | 'failed' = 'failed';
//         const directiveLine = stage3.directiveLines.find(d => d.command === DirectiveCommand.Import && d.hasParameter && d.receiverName === directiveReceiverName);
//         if (!!directiveLine && passDetails.scope !== PassScope.Local) {
//             const importPath = directiveLine.parameterValue.split(':');
//             const externalBlock = passDetails.externalBlocks.find(b => b.objectName === importPath[0] && b.blockName === importPath[1]);
//             if (!!externalBlock) {
//                 result = {
//                     argNumber: stage5Arg.argNumber,
//                     isResolved: true,
//                     numericValue: S5PossibleAliasResolver.getNumericValueForBlockAddress(passDetails, externalBlock.address),
//                     tokenIndices: stage5Arg.tokenIndices
//                 }
//             } else { // could be an imported alias
//                 const externalAlias = passDetails.externalAliases.find(b => b.objectName === importPath[0] && b.receiverName === importPath[1]);
//                 if (!!externalAlias) {
//                     result = {
//                         argNumber: stage5Arg.argNumber,
//                         isResolved: true,
//                         numericValue: externalAlias.resolvedValue,
//                         tokenIndices: stage5Arg.tokenIndices
//                     }
//                 }
//             }
//         }
//         return result;
//     }

//     private static tryFromAliasDirective(directiveReceiverName: string, stage5Arg: S5InstructionArg,
//         stage3: Stage3Object, stage4: Stage4Object, passDetails: PassDetails): S5InstructionArg | 'failed' {
//         let result: S5InstructionArg | 'failed' = 'failed';
//         const directiveLine = stage3.directiveLines.find(d => d.command === DirectiveCommand.Alias && d.hasParameter && d.receiverName === directiveReceiverName);
//         if (!!directiveLine && passDetails.scope !== PassScope.Local) {
//             const value = DirectiveParameterValueResolver.tryResolve(directiveLine.parameterValue, stage3, stage4);
//             if (value !== 'invalid') {
//                 result = {
//                     argNumber: stage5Arg.argNumber,
//                     isResolved: true,
//                     numericValue: value,
//                     tokenIndices: stage5Arg.tokenIndices
//                 }
//             }
//             // if (directiveLine.parameterValue.startsWith('$')) { // AutoLabelRef
//             //     const targetLabelName = directiveLine.parameterValue.replace('$', '').trim();
//             //     const referencedLabel = preliminaryView.labelLines.find(ln => ln.normalizedName === targetLabelName);
//             //     if (!!referencedLabel) {
//             //         const labelLine = immediateView.labelLines.find(ln => ln.lineIndex === referencedLabel.lineIndex);
//             //         if (!!labelLine) {
//             //             result = {
//             //                 argNumber: binaryArg.argNumber,
//             //                 isResolved: true,
//             //                 numericValue: labelLine.blockAddress.clone(),
//             //                 tokenIndices: binaryArg.tokenIndices
//             //             }
//             //         }
//             //     }
//             // } else if (directiveLine.parameterValue.startsWith('#')) { // AutoMemRef
//             //     const memoryAddressOrdinal = Number.parseInt(directiveLine.parameterValue.replace('#', '').trim());
//             //     if (Number.isInteger(memoryAddressOrdinal)) {
//             //         result = {
//             //             argNumber: binaryArg.argNumber,
//             //             isResolved: true,
//             //             numericValue: ByteSequenceCreator.QuadByte(memoryAddressOrdinal),
//             //             tokenIndices: binaryArg.tokenIndices
//             //         }
//             //     }
//             // } else if (RegExp(/^([ \t]{0,})([0-9]+)([ \t]{0,})([qtdb]{0,1})$/).test(directiveLine.parameterValue)) { // Inline base-10 number
//             //     const numericValue = Number.parseInt(directiveLine.parameterValue.trim().replace(/[qtdb]/g, ''));
//             //     if (Number.isInteger(numericValue)) {
//             //         const createSeq: (n: number) => DynamicByteSequence = directiveLine.parameterValue.endsWith('b')
//             //             ? (n) => ByteSequenceCreator.Byte(n)
//             //             : directiveLine.parameterValue.endsWith('d')
//             //             ? (n) => ByteSequenceCreator.DoubleByte(n)
//             //             : directiveLine.parameterValue.endsWith('t')
//             //             ? (n) => ByteSequenceCreator.TriByte(n)
//             //             : (n) => ByteSequenceCreator.QuadByte(n);

//             //         result = {
//             //             argNumber: binaryArg.argNumber,
//             //             isResolved: true,
//             //             numericValue: createSeq(numericValue),
//             //             tokenIndices: binaryArg.tokenIndices
//             //         }
//             //     }
//             // } else if (RegExp(/^([ \t]{0,})(0x)([ \t]{0,})([0-9]+)([ \t]{0,})([qtdb]{0,1})$/).test(directiveLine.parameterValue)) { // Inline base-16 number
//             //     const numericValue = Number.parseInt(directiveLine.parameterValue.trim().replace(/[qtdb]/g, ''), 16);
//             //     if (Number.isInteger(numericValue)) {
//             //         const createSeq: (n: number) => DynamicByteSequence = directiveLine.parameterValue.endsWith('b')
//             //             ? (n) => ByteSequenceCreator.Byte(n)
//             //             : directiveLine.parameterValue.endsWith('d')
//             //             ? (n) => ByteSequenceCreator.DoubleByte(n)
//             //             : directiveLine.parameterValue.endsWith('t')
//             //             ? (n) => ByteSequenceCreator.TriByte(n)
//             //             : (n) => ByteSequenceCreator.QuadByte(n);

//             //         result = {
//             //             argNumber: binaryArg.argNumber,
//             //             isResolved: true,
//             //             numericValue: createSeq(numericValue),
//             //             tokenIndices: binaryArg.tokenIndices
//             //         }
//             //     }
//             // }
//         }
//         return result;
//     }

//     private static getNumericValueForBlockAddress(passDetails: PassDetails, address: QuadByte): DynamicByteSequence {
//         let numericValue = address;
//         if (passDetails.scope === PassScope.PostGlobal) {
//             const reorderInfo = passDetails.instructionReorderMap.find(x => address.isEqualTo(x.originalIndex));
//             if (!!reorderInfo) {
//                 numericValue = ByteSequenceCreator.QuadByte(reorderInfo.reorderedIndex * INSTRUCTION_BYTE_COUNT);
//             }
//         }
//         return numericValue;
//     }
// }