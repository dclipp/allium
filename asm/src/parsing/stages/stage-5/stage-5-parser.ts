import { S5Instruction } from './s5-instruction';
import { Stage5Object } from './stage-5-object';
import { StageParserOutput } from '../stage-parser-output';
import { ByteSequenceCreator, INSTRUCTION_BYTE_COUNT, ByteSequenceLength, DynamicByteSequence, RegisterHelper, Mnemonic, MnemonicHelper } from '@allium/types';
import { S5InstructionArg } from './s5-instruction-arg';
import { S3InstructionArg } from '../stage-3/instruction/s3-instruction-arg';
import { InstructionArgumentKind } from '../../shared/kinds/instruction-argument-kind';
import { ParseOptions } from '../../parse-options';
import { Token } from '../stage-1/token';
import { PassDetails } from '../../shared/parser-types/pass-details';
import { AsmMessageHelper } from '../../../messages/asm-message-helper';
import { ASM_MESSAGES } from '../../../messages/asm-messages';
import { AsmMessageClassification } from '../../../messages/asm-message-classification';
import { MessageList } from '../../../messages/message-list';
import { ConstantInjectorValueResolver } from '../../shared/constant-injector/constant-injector-value-resolver';
import { StageParser } from '../stage-parser';
import { WorkingParserPayload } from '../../shared/parser-types/internal-payload/working-parser-payload';
import { PassScope } from '../../passes/pass-scope';
import { S4AutoAddressRef } from '../stage-4/s4-auto-address-ref';
import { ObjectSymbol } from '../../shared/symbol/object-symbol';

class Stage5Parser {
    public static parse(workingPayload: WorkingParserPayload, passDetails: PassDetails, parseOptions: ParseOptions): StageParserOutput<Stage5Object> {
        // const allInstructionLines = immediateView.instructionLines;
        const messages = new MessageList();

        const instructions: Array<S5Instruction> = workingPayload.stage4.instructionLines.map((il, ilIndex) => {
            const pLine = workingPayload.stage3.instructionLines.find(ln => ln.lineIndex === il.lineIndex);
            let instructionArgs = new Array<S5InstructionArg>();
            if (pLine.argumentList.length > 0) {
                pLine.argumentList.forEach((a, argIndex) => {
                    const iaResult = Stage5Parser.parseInstructionArg(a, argIndex, pLine.mnemonic.mnemonic, parseOptions, workingPayload.stage1.tokens, il.autoAddressRefs, workingPayload.stage3.symbols, passDetails);
                    let iaArg = iaResult.arg;
                    // if (passDetails.scope !== PassScope.Local && !iaResult.arg.isResolved && a.determinedKind === InstructionArgumentKind.PossibleAlias) {
                    //     const ria = S5PossibleAliasResolver.tryResolve(a, iaResult.arg, workingPayload.stage3, workingPayload.stage4, passDetails);
                    //     if (ria !== 'failed') {
                    //         iaArg = ria;
                    //     }
                    // }

                    messages.merge(iaResult.messages);
                    instructionArgs.push(iaArg);
                })

                const instructionArgsByteCount = instructionArgs.map(ia => ia.isResolved ? ia.numericValue.LENGTH : 0).reduce((x, y) => x + y, 0);
                if (instructionArgsByteCount > INSTRUCTION_BYTE_COUNT) {
                    const nextInstructionLine = workingPayload.stage3.instructionLines.find(ln => ln.lineIndex === il.lineIndex + 1);
                    const nextMnemonicTokenIndex = nextInstructionLine.mnemonic.tokenIndices[0];
                    const startToken = workingPayload.stage1.tokens.find(t => t.index === pLine.mnemonic.tokenIndices[0]);
                    const endToken = workingPayload.stage1.tokens.find(t => t.index === nextMnemonicTokenIndex - 1);
                    messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage5.ArgumentsResized, {
                        startPosition: startToken.startPosition,
                        endPosition: endToken.endPosition
                    }))
                    const resizedArgs = Stage5Parser.resizeInstructionArgs(instructionArgs);
                    instructionArgs = resizedArgs;
                }
            }
            
            if (!!pLine.mnemonic) {
                return {
                    address: ByteSequenceCreator.QuadByte(ilIndex * INSTRUCTION_BYTE_COUNT),
                    argCount: pLine.argumentList.length as 0 | 1 | 2 | 3,
                    isFullyResolved: instructionArgs.every(ia => ia.isResolved),
                    mnemonicValue: ByteSequenceCreator.Byte(pLine.mnemonic.mnemonic),
                    mnemonicTokenIndex: pLine.mnemonic.tokenIndices[0],
                    argumentList: instructionArgs
                }
            } else {
                return {
                    address: ByteSequenceCreator.QuadByte(ilIndex * INSTRUCTION_BYTE_COUNT),
                    argCount: pLine.argumentList.length as 0 | 1 | 2 | 3,
                    isFullyResolved: false,
                    mnemonicValue: null,//ByteSequenceCreator.Byte(pLine.mnemonic.mnemonic),
                    mnemonicTokenIndex: -1,
                    argumentList: instructionArgs
                }
            }
        })

        return {
            object: {
                instructions: instructions,
                byteCount: instructions.length * INSTRUCTION_BYTE_COUNT
            },
            messages: messages,
        }
    }

    private static parseInstructionArg(arg: S3InstructionArg, argIndex: number, mnemonic: Mnemonic,
        parseOptions: ParseOptions, allTokens: Array<Token>, autoAddressRefs: Array<S4AutoAddressRef>, symbols: Array<ObjectSymbol>, passDetails: PassDetails): BinaryEquivalentInstructionArgParseResult {
        const messages = new MessageList();
        let numericValue: DynamicByteSequence = undefined;

        if (arg.determinedKind === InstructionArgumentKind.RegisterRef) {
            const regRef = arg.asRegRef();
            if (regRef.register !== undefined) {
                numericValue = ByteSequenceCreator.Byte(RegisterHelper.getNumericFromRegisterReference(regRef));
            }
        } else if (arg.determinedKind === InstructionArgumentKind.InlineValue) {
            const inlineValue = arg.asInlineValue();
            const valueDetails = Stage5Parser.getExpectedInlineValueSize(mnemonic);
            if (valueDetails === null) {
                messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage5.NotAnInlineValueMnemonic, {
                    startPosition: allTokens[arg.tokenIndices[0]].startPosition,
                    endPosition: allTokens[arg.tokenIndices[arg.tokenIndices.length - 1]].endPosition
                }));
            } else {
                const isOversized = inlineValue >= Math.pow(2, valueDetails.size * 8);
                if (isOversized) {
                    let message = AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage5.InlineValueTooLarge, {
                        startPosition: allTokens[arg.tokenIndices[0]].startPosition,
                        endPosition: allTokens[arg.tokenIndices[arg.tokenIndices.length - 1]].endPosition
                    });
                    if (parseOptions.treatOversizedInlineValuesAsWarnings) {
                        if (parseOptions.oversizedInlineValueSizing === 'quad') {
                            numericValue = ByteSequenceCreator.QuadByte(inlineValue);
                            message = AsmMessageHelper.reclassifyMessage(message, AsmMessageClassification.Warning);
                        } else if (parseOptions.oversizedInlineValueSizing === 'tri' && inlineValue < Math.pow(2, 24)) {
                            numericValue = ByteSequenceCreator.TriByte(inlineValue);
                            message = AsmMessageHelper.reclassifyMessage(message, AsmMessageClassification.Warning);
                        } else if (parseOptions.oversizedInlineValueSizing === 'double' && inlineValue < Math.pow(2, 16)) {
                            numericValue = ByteSequenceCreator.DoubleByte(inlineValue);
                            message = AsmMessageHelper.reclassifyMessage(message, AsmMessageClassification.Warning);
                        } else if (parseOptions.oversizedInlineValueSizing === 'min-required') {
                            const requiredLength: ByteSequenceLength = inlineValue < Math.pow(2, 8)
                                ? 1
                                : inlineValue < Math.pow(2, 16)
                                ? 2
                                : inlineValue < Math.pow(2, 14)
                                ? 3
                                : 4;
                            switch (requiredLength) {
                                case 1:
                                    numericValue = ByteSequenceCreator.Byte(inlineValue);
                                    break;
                                case 2:
                                    numericValue = ByteSequenceCreator.DoubleByte(inlineValue);
                                    break;
                                case 3:
                                    numericValue = ByteSequenceCreator.TriByte(inlineValue);
                                    break;
                                case 4:
                                    numericValue = ByteSequenceCreator.QuadByte(inlineValue);
                                    break;
                            }
                            message = AsmMessageHelper.reclassifyMessage(message, AsmMessageClassification.Warning);
                        }
                    }
                    messages.addDistinct(message);
                } else {
                    numericValue = valueDetails.creator(inlineValue);
                }
            }
        } else if (arg.determinedKind === InstructionArgumentKind.AutoAddressRef) {
            const autoAddressRef = autoAddressRefs.find(a => a.tokenIndices.every(ti => arg.tokenIndices.includes(ti)));
            if (!!autoAddressRef) {
                if (autoAddressRef.resolvedAddress === 'deferred') {
                    if (passDetails.scope !== PassScope.Local) {
                        messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage5.UnresolvedTargetBlockAddress, {
                            startPosition: allTokens[arg.tokenIndices[0]].startPosition,
                            endPosition: allTokens[arg.tokenIndices[arg.tokenIndices.length - 1]].endPosition
                        }))
                    }
                } else if (autoAddressRef.resolvedAddress === 'error') {
                    messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage5.UnresolvedTargetBlockAddress, {
                        startPosition: allTokens[arg.tokenIndices[0]].startPosition,
                        endPosition: allTokens[arg.tokenIndices[arg.tokenIndices.length - 1]].endPosition
                    }))
                } else {
                    numericValue = autoAddressRef.resolvedAddress;
                }
            } else {
                messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage5.UnresolvedTargetBlockAddress, {
                    startPosition: allTokens[arg.tokenIndices[0]].startPosition,
                    endPosition: allTokens[arg.tokenIndices[arg.tokenIndices.length - 1]].endPosition
                }))
            }
        } else if (arg.determinedKind === InstructionArgumentKind.ConstantInjector) {
            const ciDetail = arg.asConstantInjector();
            if (ciDetail.hasValue) {
                const resolvedValue = ConstantInjectorValueResolver.tryResolve(ciDetail.injectionKind, ciDetail.injectionValue);
                if (resolvedValue !== 'invalid') {
                    numericValue = resolvedValue;
                }
            }
        } else if (arg.determinedKind === InstructionArgumentKind.AliasRef) {
            const arDetail = arg.asAliasRef();
            const symbol = symbols.find(s => s.name === arDetail.aliasName);
            if (!!symbol && symbol.value !== 'deferred') {
                numericValue = symbol.value;
            }
        }

        return {
            arg: {
                argNumber: (argIndex + 1) as ByteSequenceLength,
                isResolved: numericValue !== undefined,
                numericValue: numericValue,
                tokenIndices: arg.tokenIndices
            },
            messages: messages
        }
    }

    private static resizeInstructionArgs(instructionArgs: Array<S5InstructionArg>): Array<S5InstructionArg> {
        const resizedArgs = instructionArgs.map(ia => {
            return {
                argNumber: ia.argNumber,
                isResolved: ia.isResolved,
                numericValue: ia.isResolved ? ia.numericValue.clone() : undefined,
                tokenIndices: ia.tokenIndices
            }
        })
        let currentArgIndex = resizedArgs.length - 1;
        let instructionArgsByteCount = resizedArgs.map(ia => ia.isResolved ? ia.numericValue.LENGTH : 0).reduce((x, y) => x + y, 0);
        while (instructionArgsByteCount > INSTRUCTION_BYTE_COUNT) {
            if (resizedArgs[currentArgIndex].isResolved) {
                const currentLength = resizedArgs[currentArgIndex].numericValue.LENGTH;
                if (currentLength === 4) {
                    resizedArgs[currentArgIndex] = {
                        argNumber: resizedArgs[currentArgIndex].argNumber,
                        isResolved: resizedArgs[currentArgIndex].isResolved,
                        numericValue: ByteSequenceCreator.TriByte(ByteSequenceCreator.Unbox(resizedArgs[currentArgIndex].numericValue) & (Math.pow(2, 24) - 1)),
                        tokenIndices: resizedArgs[currentArgIndex].tokenIndices
                    }
                } else if (currentLength === 3) {
                    resizedArgs[currentArgIndex] = {
                        argNumber: resizedArgs[currentArgIndex].argNumber,
                        isResolved: resizedArgs[currentArgIndex].isResolved,
                        numericValue: ByteSequenceCreator.DoubleByte(ByteSequenceCreator.Unbox(resizedArgs[currentArgIndex].numericValue) & (Math.pow(2, 16) - 1)),
                        tokenIndices: resizedArgs[currentArgIndex].tokenIndices
                    }
                } else if (currentLength === 2) {
                    resizedArgs[currentArgIndex] = {
                        argNumber: resizedArgs[currentArgIndex].argNumber,
                        isResolved: resizedArgs[currentArgIndex].isResolved,
                        numericValue: ByteSequenceCreator.Byte(ByteSequenceCreator.Unbox(resizedArgs[currentArgIndex].numericValue) & (Math.pow(2, 8) - 1)),
                        tokenIndices: resizedArgs[currentArgIndex].tokenIndices
                    }
                } else {
                    currentArgIndex--;
                }
            } else {
                currentArgIndex--;
            }
        }

        return resizedArgs;
    }

    private static getExpectedInlineValueSize(mnemonic: Mnemonic): {
        readonly size: ByteSequenceLength;
        readonly creator: (v: number) => DynamicByteSequence;
    } | null {
        if (MnemonicHelper.opArgs.isInlineQuadByteOp(mnemonic)) {
            return {
                size: 4,
                creator: ByteSequenceCreator.QuadByte
            }
        } else if (MnemonicHelper.opArgs.isInlineTriByteOp(mnemonic)) {
            return {
                size: 3,
                creator: ByteSequenceCreator.TriByte
            }
        } else if (MnemonicHelper.opArgs.isInlineDoubleByteOp(mnemonic)) {
            return {
                size: 2,
                creator: ByteSequenceCreator.DoubleByte
            }
        } else if (MnemonicHelper.opArgs.isInlineByteOp(mnemonic)) {
            return {
                size: 1,
                creator: ByteSequenceCreator.Byte
            }
        } else {
            return null;
        }
    }
}

interface BinaryEquivalentInstructionArgParseResult {
    arg: S5InstructionArg;
    messages: MessageList;
}

export const parseStage5: StageParser<Stage5Object> = Stage5Parser.parse;