import { ParsedAssembly } from '../parsing/parsed-assembly';
import { Byte, ByteSequenceCreator, INSTRUCTION_BYTE_COUNT } from '@allium/types';
import { S5InstructionArg } from '../parsing/stages/stage-5/s5-instruction-arg';
import { ExtendedAsmMessage } from '../messages/extended-asm-message';
import { CompiledAssembly } from './compiled-assembly';
import { AssemblyEntryPoint } from '../api-types/assembly-entry-point';

export class Compiler {
    public static compile(parserOutput: ParsedAssembly, entryPoint?: AssemblyEntryPoint): CompiledAssembly {
        const compiledObjects = new Array<{
            readonly succeeded: boolean;
            readonly objectName: string;
            readonly bytes: ReadonlyArray<Byte>;
        }>();

        const messages = new Array<ExtendedAsmMessage>();
        if (parserOutput.succeeded) {
            for (let i = 0; i < parserOutput.globalPasses.length; i++) {
                const bytes = new Array<Byte>();
                parserOutput.globalPasses[i].stage5.instructions.forEach(instruction => {
                    bytes.push(instruction.mnemonicValue.clone());
                    try {
                    if (instruction.argCount > 0) {
                        Compiler.compileArguments(instruction.argumentList).forEach(b => {
                            bytes.push(b);
                        })
                    } else {
                        bytes.push(ByteSequenceCreator.Byte(0));
                        bytes.push(ByteSequenceCreator.Byte(0));
                        bytes.push(ByteSequenceCreator.Byte(0));
                        bytes.push(ByteSequenceCreator.Byte(0));
                    }} catch(exc) {
                        const x1 = instruction;
                        const zt1 = parserOutput.globalPasses[0].stage1.tokens;
                        const zt2 = parserOutput.globalPasses[1].stage1.tokens;
                        throw exc;
                    }
                })

                parserOutput.messages.forEach(m => messages.push(m));
                compiledObjects.push({
                    objectName: parserOutput.globalPasses[i].objectName,
                    bytes: bytes,
                    succeeded: parserOutput.succeeded
                });
            }
        }

        const programBytes = compiledObjects.map(co => co.bytes).reduce((x, y) => x.concat(y), []);
        let compiledAssembly: CompiledAssembly = {
            succeeded: compiledObjects.every(co => co.succeeded),
            messages: messages,
            programBytes: programBytes,
            objects: compiledObjects,
            toFileContent: (format) => {
                return Compiler.toFileContent(programBytes, format);
            }
        };

        if (!!entryPoint && !!parserOutput.entryPoint.objectName) {
            compiledAssembly = Compiler.applyCustomEntryPoint(parserOutput, compiledAssembly)
        }

        return compiledAssembly;
    }

    private static compileArguments(argumentList: Array<S5InstructionArg>): Array<Byte> {
        const bytes = new Array<Byte>();
        argumentList.forEach(arg => {
            const numericValue = ByteSequenceCreator.Unbox(arg.numericValue);
            bytes.push(ByteSequenceCreator.Byte(numericValue & 255));
            if (arg.numericValue.LENGTH > 1) {
                bytes.push(ByteSequenceCreator.Byte((numericValue >> 8) & 255));

                if (arg.numericValue.LENGTH > 2) {
                    bytes.push(ByteSequenceCreator.Byte((numericValue >> 16) & 255));

                    if (arg.numericValue.LENGTH > 3) {
                        bytes.push(ByteSequenceCreator.Byte((numericValue >> 24) & 255));
                    }
                }
            }
        })

        while (bytes.length < INSTRUCTION_BYTE_COUNT - 1) {
            bytes.push(ByteSequenceCreator.Byte(0));
        }
        
        return bytes;
    }

//     private static applyCustomEntryPointOLD2(entryPoint: AssemblyEntryPoint, parserOutput: ParsedAssembly, compiledAssembly: CompiledAssembly): CompiledAssembly {
//         const rearrangedProgramBytes = new Array<Byte>();
//         console.log(`ep=${entryPoint.label}`)
//         const customEntryPass = parserOutput.globalPasses.find(gp => gp.objectName === entryPoint.objectName);
//         if (!!customEntryPass) {
//             const customEntryInstructions = customEntryPass.stage4.instructionLines
//                 .map((il, iIdx) => {
//                     if (il.blockLabelName === entryPoint.label) {
//                         return iIdx;
//                     } else {
//                         return -1;
//                     }
//                 })
//                 .filter(iIdx => iIdx > -1)
//                 .map(iIdx => customEntryPass.stage5.instructions.find(i => i.address.isEqualTo(customEntryPass.baseAddress.computeSum(iIdx))))
//             customEntryInstructions.forEach(cei => {
//                 rearrangedProgramBytes.push(cei.mnemonicValue.clone());
//                 if (cei.argumentList.length === 0) {
//                     rearrangedProgramBytes.push(ByteSequenceCreator.Byte(0));
//                     rearrangedProgramBytes.push(ByteSequenceCreator.Byte(0));
//                     rearrangedProgramBytes.push(ByteSequenceCreator.Byte(0));
//                     rearrangedProgramBytes.push(ByteSequenceCreator.Byte(0));
//                 } else {
//                     Compiler.compileArguments(cei.argumentList).forEach(b => {
//                         rearrangedProgramBytes.push(b);
//                     })
//                 }
//             })

//             const defaultEntryPass = parserOutput.globalPasses.find(gp => gp.stage5.instructions.length > 0);
//             const defaultEntryLabel = defaultEntryPass.stage3.labelLines[0].normalizedName;
//             const defaultEntryInstructions = defaultEntryPass.stage4.instructionLines
//             .map((il, iIdx) => {
//                 if (il.blockLabelName === defaultEntryLabel) {
//                     return iIdx;
//                 } else {
//                     return -1;
//                 }
//             })
//             .filter(iIdx => iIdx > -1)
//             .map(iIdx => defaultEntryPass.stage5.instructions.find(i => i.address.isEqualTo(defaultEntryPass.baseAddress.computeSum(iIdx))))

//             const normalIndexOfFirstCustomEntryInstruction = ByteSequenceCreator.Unbox(customEntryInstructions[0].address);
//             for (let i = defaultEntryInstructions.length * INSTRUCTION_BYTE_COUNT; i < compiledAssembly.programBytes.length && i < normalIndexOfFirstCustomEntryInstruction; i++) {
//                 rearrangedProgramBytes.push(compiledAssembly.programBytes[i].clone());                
//             }

//             defaultEntryInstructions.forEach(dei => {
//                 rearrangedProgramBytes.push(dei.mnemonicValue.clone());
//                 if (dei.argumentList.length === 0) {
//                     rearrangedProgramBytes.push(ByteSequenceCreator.Byte(0));
//                     rearrangedProgramBytes.push(ByteSequenceCreator.Byte(0));
//                     rearrangedProgramBytes.push(ByteSequenceCreator.Byte(0));
//                     rearrangedProgramBytes.push(ByteSequenceCreator.Byte(0));
//                 } else {
//                     Compiler.compileArguments(dei.argumentList).forEach(b => {
//                         rearrangedProgramBytes.push(b);
//                     })
//                 }
//             })

//             for (let i = normalIndexOfFirstCustomEntryInstruction; i < compiledAssembly.programBytes.length; i++) {
//                 rearrangedProgramBytes.push(compiledAssembly.programBytes[i].clone());                
//             }

//         //    return rearrangedProgramBytes;
//         } else {
// //TODO
//         }

//         // for (let i = 0; i < compiledAssembly.programBytes.length; i += INSTRUCTION_BYTE_COUNT) {
//         //     if (parserOutput.entryPoint.indexRelocations.has(i)) {
//         //         const swapIndex = parserOutput.entryPoint.indexRelocations.get(i);
//         //         for (let j = 0; j < INSTRUCTION_BYTE_COUNT; j++) {
//         //             rearrangedProgramBytes.push(compiledAssembly.programBytes[swapIndex + j])
//         //         }
//         //     } else {
//         //         for (let j = 0; j < INSTRUCTION_BYTE_COUNT; j++) {
//         //             rearrangedProgramBytes.push(compiledAssembly.programBytes[i + j]);
//         //         }
//         //     }
//         // }

//         return {
//             succeeded: compiledAssembly.succeeded,
//             messages: compiledAssembly.messages,
//             programBytes: rearrangedProgramBytes,
//             objects: compiledAssembly.objects
//         };
//     }

    // private static applyCustomEntryPointOLD(entryPoint: AssemblyEntryPoint, parserOutput: ParsedAssembly, compiledAssembly: CompiledAssembly): CompiledAssembly {
    //     const customEntryInstructionIndices = new Array<number>();
    //     const defaultEntryInstructionIndices = new Array<number>();
    //     const customEntryPass = parserOutput.globalPasses.find(gp => gp.objectName === entryPoint.objectName);
    //     if (!!customEntryPass) {
    //         const customEntryInstructions = customEntryPass.stage4.instructionLines.filter(il => il.blockLabelName === entryPoint.label);
    //         if (customEntryInstructions.length > 0) {
    //             customEntryInstructions.forEach(il => {
    //                 const instructionIndex = ByteSequenceCreator.Unbox(customEntryPass.baseAddress.computeSum(il.lineIndex * INSTRUCTION_BYTE_COUNT)) / INSTRUCTION_BYTE_COUNT;
    //                 customEntryInstructionIndices.push(instructionIndex);
    //             })
    //             const defaultFirstInstructionLine = parserOutput.globalPasses[0].stage4.instructionLines[0];
    //             const defaultEntryInstructions = parserOutput.globalPasses[0].stage4.instructionLines
    //                 .filter(il => il.blockLabelName === defaultFirstInstructionLine.blockLabelName);
    //                 defaultEntryInstructions.forEach(il => {
    //                     defaultEntryInstructionIndices.push(il.lineIndex);
    //             })
    //         }
    //     }

    //     const rearrangedProgramBytes = new Array<Byte>();
    //     let pbIndex = 0;
    //     while (pbIndex < compiledAssembly.programBytes.length) {
    //         if (pbIndex <= defaultEntryInstructionIndices.last()) {
    //             customEntryInstructionIndices.forEach(iIdx => {
    //                 rearrangedProgramBytes.push(compiledAssembly.programBytes[iIdx].clone());
    //             })
    //             pbIndex += INSTRUCTION_BYTE_COUNT * defaultEntryInstructionIndices.length;
    //         } else if (pbIndex >= customEntryInstructionIndices[0] && pbIndex <= customEntryInstructionIndices.last()) {
    //             defaultEntryInstructionIndices.forEach(iIdx => {
    //                 rearrangedProgramBytes.push(compiledAssembly.programBytes[iIdx].clone());
    //             })
    //             pbIndex += INSTRUCTION_BYTE_COUNT * customEntryInstructionIndices.length;
    //         } else {
    //             rearrangedProgramBytes.push(compiledAssembly.programBytes[pbIndex].clone());
    //             pbIndex += INSTRUCTION_BYTE_COUNT;
    //         }
    //     }
        
    //     const relocations = new Map<number, number>();
    //     defaultEntryInstructionIndices.forEach(i => {
    //         relocations.set(i, customEntryInstructionIndices[0] + i);
    //     })
    //     customEntryInstructionIndices.forEach((i, ii) => {
    //         relocations.set(i, ii);
    //     })

    //     return {
    //         succeeded: compiledAssembly.succeeded,
    //         messages: compiledAssembly.messages,
    //         programBytes: rearrangedProgramBytes,
    //         objects: compiledAssembly.objects
    //     };
    // }

    private static applyCustomEntryPoint(parserOutput: ParsedAssembly, compiledAssembly: CompiledAssembly): CompiledAssembly {
        const instructions = new Array<{
            readonly reorderedIndex: number;
            readonly objectSucceeded: boolean;
            readonly objectName: string;
            readonly bytes: ReadonlyArray<Byte>;
        }>();

        compiledAssembly.objects.forEach(co => {
            for (let i = 0; i < co.bytes.length; i += INSTRUCTION_BYTE_COUNT) {
                const instructionBytes = co.bytes.slice(i, i + INSTRUCTION_BYTE_COUNT);
                const reorderInfo = parserOutput.entryPoint.instructionMap.findByOriginalIndex(instructions.length);
                instructions.push({
                    reorderedIndex: reorderInfo.reorderedIndex,
                    objectSucceeded: co.succeeded,
                    objectName: co.objectName,
                    bytes: instructionBytes
                })
            }
        })

        const compiledObjects = compiledAssembly.objects.map(co => {
            return {
                succeeded: co.succeeded,
                objectName: co.objectName,
                bytes: instructions
                    .filter(i => i.objectName === co.objectName)
                    .sort((a, b) => a.reorderedIndex - b.reorderedIndex)
                    .map(i => i.bytes)
                    .reduce((x, y) => x.concat(y), [])
            }
        });
        
        const programBytes = instructions.sort((a, b) => a.reorderedIndex - b.reorderedIndex).map(i => i.bytes).reduce((x, y) => x.concat(y), []);
        return {
            succeeded: compiledAssembly.succeeded,
            messages: compiledAssembly.messages,
            programBytes: programBytes,
            objects: compiledObjects,
            toFileContent: (format) => {
                return Compiler.toFileContent(programBytes, format);
            }
        };
    }

    private static toFileContent(bytes: ReadonlyArray<Byte>, format: 'base10' | 'base16' | 'binary'): string {
        if (format === 'binary') {
            return bytes.map(b => String.fromCharCode(ByteSequenceCreator.Unbox(b))).reduce((x, y) => x + y, '');
        } else {
            const radix = format === 'base10' ? 10 : 16;
            return bytes.map(b => b.toString({ radix: radix, padZeroes: true })).join(' ');
        }
    }
}