import { PassDetails } from '../../shared/parser-types/pass-details';
import { TriByte, QuadByte, ByteSequenceCreator, INSTRUCTION_BYTE_COUNT, MnemonicHelper, DynamicByteSequence } from '@allium/types';
import { MessageList } from '../../../messages/message-list';
import { S3Mnemonic } from '../stage-3/instruction/s3-mnemonic';
import { S3InstructionArg } from '../stage-3/instruction/s3-instruction-arg';
import { Stage3Object } from '../stage-3/stage-3-object';
import { S4LabelLine } from './s4-label-line';
import { Token } from '../stage-1/token';
import { S4AutoAddressRef } from './s4-auto-address-ref';
import { AutoAddressRefKind } from '../../shared/auto-address-ref/auto-address-ref-kind';
import { PassScope } from '../../passes/pass-scope';
import { RelativeRefAnchor } from '../../shared/auto-address-ref/relative-ref-anchor';
import { RelativeExpressionOperation } from '../../shared/auto-address-ref/relative-expression-operation';
import { AsmMessageHelper } from '../../../messages/asm-message-helper';
import { ASM_MESSAGES } from '../../../messages/asm-messages';
import { ObjectSymbolKind } from '../../shared/symbol/object-symbol-kind';
import { S3DirectiveLine } from '../stage-3/directive/s3-directive-line';
import { DirectiveCommand } from '../../shared/directive/directive-command';

export class S4AutoAddressRefParser {
    public static parseAutoAddressRef(s3Mnemonic: S3Mnemonic, autoAddressRefArg: S3InstructionArg, stage3: Stage3Object,
        labelLines: Array<S4LabelLine>, allTokens: Array<Token>, passDetails: PassDetails, useMockForExternalAddresses: boolean)
    : { autoAddressRef: S4AutoAddressRef, messages: MessageList } {
        const messages = new MessageList();
        const details = autoAddressRefArg.asAutoAddressRef();

        // let targetAddress: TriByte | QuadByte | 'deferred' = 'deferred';
        // let resolveFn: (passDetails: PassDetails) => TriByte | QuadByte | 'deferred' | 'error';
        let resolvedAddress: TriByte | QuadByte | 'deferred' | 'error' = 'error';

        if (passDetails.scope === PassScope.Local) {
            resolvedAddress = 'deferred';
        } else {
            if (details.kind === AutoAddressRefKind.Block) {
                if (details.isEmbedded) {
                    const embAddress = S4AutoAddressRefParser.findEmbeddedBlockAddress(passDetails, s3Mnemonic.lineIndex, details.blockName);

                    if (embAddress === 'deferred') {
                        resolvedAddress = 'deferred';
                    } else if (!!embAddress) {
                        const index = ByteSequenceCreator.Unbox(embAddress) / INSTRUCTION_BYTE_COUNT;
                        const reorderedIndex = S4AutoAddressRefParser.getReorderedIndex(index, passDetails);
                        if (reorderedIndex > -1) {
                            resolvedAddress = ByteSequenceCreator.QuadByte(reorderedIndex * INSTRUCTION_BYTE_COUNT);
                        } else {
                            messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage4.InvalidAutoAddressRef, {
                                startPosition: allTokens[autoAddressRefArg.tokenIndices[0]].startPosition,
                                endPosition: allTokens[autoAddressRefArg.tokenIndices[autoAddressRefArg.tokenIndices.length - 1]].endPosition
                            }))
                        }
                    } else {
                        messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage4.InvalidAutoAddressRef, {
                            startPosition: allTokens[autoAddressRefArg.tokenIndices[0]].startPosition,
                            endPosition: allTokens[autoAddressRefArg.tokenIndices[autoAddressRefArg.tokenIndices.length - 1]].endPosition
                        }))
                    }
                } else if (details.isExternalBlock) {
                    if (useMockForExternalAddresses) {
                        resolvedAddress = !!passDetails.baseAddressOffset
                            ? passDetails.baseAddressOffset.clone()
                            : ByteSequenceCreator.QuadByte(0);
                    } else {
                        const ebAddress = S4AutoAddressRefParser.findExternalBlockAddress(passDetails, stage3.directiveLines, details.externalObjectName, details.blockName);
                        // const symbols = passDetails.symbols.find(s => s.objectName === details.externalObjectName);
                        // let eb = passDetails.externalBlocks.find(b => b.objectName === details.externalObjectName);
                        // if (!(!!eb)) { // Check if the name is the name of an imported external object
                        //     const directive = stage3.directiveLines.find(dl => dl.command === DirectiveCommand.Import && dl.receiverName === details.externalObjectName);
                        //     if (!!directive && directive.hasParameter) {
                        //         eb = passDetails.externalBlocks.find(b => b.objectName === directive.parameterValue);
                        //     }
                        // }

                        if (ebAddress === 'deferred') {
                            resolvedAddress = 'deferred';
                        } else if (!!ebAddress) {
                            const index = ByteSequenceCreator.Unbox(ebAddress) / INSTRUCTION_BYTE_COUNT;
                            const reorderedIndex = S4AutoAddressRefParser.getReorderedIndex(index, passDetails);
                            if (reorderedIndex > -1) {
                                resolvedAddress = ByteSequenceCreator.QuadByte(reorderedIndex * INSTRUCTION_BYTE_COUNT);
                            } else {
                                messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage4.InvalidAutoAddressRef, {
                                    startPosition: allTokens[autoAddressRefArg.tokenIndices[0]].startPosition,
                                    endPosition: allTokens[autoAddressRefArg.tokenIndices[autoAddressRefArg.tokenIndices.length - 1]].endPosition
                                }))
                            }
                        } else {
                            messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage4.InvalidAutoAddressRef, {
                                startPosition: allTokens[autoAddressRefArg.tokenIndices[0]].startPosition,
                                endPosition: allTokens[autoAddressRefArg.tokenIndices[autoAddressRefArg.tokenIndices.length - 1]].endPosition
                            }))
                        }
                    }
                } else {
                    const symbol = stage3.symbols.find(s => s.kind === ObjectSymbolKind.FirstClassBlockLabel && s.name === details.blockName);
                    if (!!symbol && symbol.value !== 'deferred') {
                        const index = ByteSequenceCreator.Unbox(symbol.value) / INSTRUCTION_BYTE_COUNT;
                        const reorderedIndex = S4AutoAddressRefParser.getReorderedIndex(index, passDetails);
                        if (reorderedIndex > -1) {
                            resolvedAddress = ByteSequenceCreator.QuadByte(reorderedIndex * INSTRUCTION_BYTE_COUNT);
                        } else {
                            messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage4.InvalidAutoAddressRef, {
                                startPosition: allTokens[autoAddressRefArg.tokenIndices[0]].startPosition,
                                endPosition: allTokens[autoAddressRefArg.tokenIndices[autoAddressRefArg.tokenIndices.length - 1]].endPosition
                            }))
                        }
                    } else {
                        messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage4.InvalidAutoAddressRef, {
                            startPosition: allTokens[autoAddressRefArg.tokenIndices[0]].startPosition,
                            endPosition: allTokens[autoAddressRefArg.tokenIndices[autoAddressRefArg.tokenIndices.length - 1]].endPosition
                        }))
                    }
                }
            } else if (details.kind === AutoAddressRefKind.Relative) {
                let anchor: number = -1;
                if (details.relativeTo === RelativeRefAnchor.RefPosition) {
                    const s3InstructionLineIndex = stage3.instructionLines.findIndex(il => il.argumentList.length > 0 && il.argumentList.some(a => a.tokenIndices.every(ti => autoAddressRefArg.tokenIndices.includes(ti))))
                    if (s3InstructionLineIndex > -1) {
                        anchor = s3InstructionLineIndex * INSTRUCTION_BYTE_COUNT;
                    } else {
                        messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage4.InvalidAutoAddressRef, {
                            startPosition: allTokens[autoAddressRefArg.tokenIndices[0]].startPosition,
                            endPosition: allTokens[autoAddressRefArg.tokenIndices[autoAddressRefArg.tokenIndices.length - 1]].endPosition
                        }))
                    }
                } else {
                    anchor = passDetails.globalInstructionCount * INSTRUCTION_BYTE_COUNT;
                }

                if (anchor > -1 && details.hasExpression) {
                    if (details.expression.operation === RelativeExpressionOperation.Add) {
                        anchor += details.expression.parameter;
                    } else {
                        anchor -= details.expression.parameter;
                    }

                    if (anchor >= Math.pow(2, 32)) {
                        messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage4.InvalidAutoAddressRef, {
                            startPosition: allTokens[autoAddressRefArg.tokenIndices[0]].startPosition,
                            endPosition: allTokens[autoAddressRefArg.tokenIndices[autoAddressRefArg.tokenIndices.length - 1]].endPosition
                        }))
                        anchor = -1;
                    } else if (anchor < 0) {
                        messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage4.InvalidAutoAddressRef, {
                            startPosition: allTokens[autoAddressRefArg.tokenIndices[0]].startPosition,
                            endPosition: allTokens[autoAddressRefArg.tokenIndices[autoAddressRefArg.tokenIndices.length - 1]].endPosition
                        }))
                        anchor = -1;
                    }
                }

                if (anchor > -1) {
                    const reorderedIndex = S4AutoAddressRefParser.getReorderedIndex(anchor, passDetails);
                    if (reorderedIndex > -1) {
                        resolvedAddress = ByteSequenceCreator.QuadByte(reorderedIndex);
                    }
                }
            } else { // Invalid ref
                messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage4.InvalidAutoAddressRef, {
                    startPosition: allTokens[autoAddressRefArg.tokenIndices[0]].startPosition,
                    endPosition: allTokens[autoAddressRefArg.tokenIndices[autoAddressRefArg.tokenIndices.length - 1]].endPosition
                }))
            }
        }

        if (resolvedAddress !== 'deferred' && resolvedAddress !== 'error' && S4AutoAddressRefParser.isTriByteRequired(s3Mnemonic)) {
            if (resolvedAddress.isLessThanOrEqualTo(S4AutoAddressRefParser._MAX_TRI_BYTE_VALUE)) {
                resolvedAddress = ByteSequenceCreator.TriByte(ByteSequenceCreator.Unbox(resolvedAddress));
            } else {
                messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage4.AutoAddressRefTooLargeForInline, {
                    startPosition: allTokens[autoAddressRefArg.tokenIndices[0]].startPosition,
                    endPosition: allTokens[autoAddressRefArg.tokenIndices[autoAddressRefArg.tokenIndices.length - 1]].endPosition
                }))
            }
        }

        return {
            autoAddressRef: {
                tokenIndices: autoAddressRefArg.tokenIndices,
                resolvedAddress: resolvedAddress
            },
            messages: messages
        }
    }

    /** Determines if the target address should be contained within a TriByte instead of a QuadByte */
    private static isTriByteRequired(s3Mnemonic: S3Mnemonic): boolean {
        return !!s3Mnemonic && MnemonicHelper.isInlineLessThanQuadValueOp(s3Mnemonic.mnemonic);
    }

    private static getReorderedIndex(originalIndex: number, passDetails: PassDetails): number {
        let reorderedIndex = -1;
        if (passDetails.scope !== PassScope.Local) {
            if (!!passDetails.instructionReorderMap) {
                const reorder = passDetails.instructionReorderMap.findByOriginalIndex(originalIndex);
                if (!!reorder) {
                    reorderedIndex = reorder.reorderedIndex;
                } else {
                    reorderedIndex = originalIndex;
                }
            } else {
                reorderedIndex = originalIndex;
            }
        }
        return reorderedIndex;
    }

    private static findExternalBlockAddress(passDetails: PassDetails, directiveLines: Array<S3DirectiveLine>, externalObjectName: string, blockName: string): DynamicByteSequence | 'deferred' | null {
        let value: DynamicByteSequence | 'deferred' | null = null;
        let symbolsForObject = passDetails.symbols.find(s => s.objectName === externalObjectName);
        let isImported = true;
        if (!!symbolsForObject) {
            isImported = directiveLines.some(dl => dl.command === DirectiveCommand.Import && dl.receiverName === externalObjectName && dl.hasParameter && !dl.parameterValue.includes(':'))
        } else {
            const line = directiveLines.find(dl => dl.command === DirectiveCommand.Import && dl.receiverName === externalObjectName && dl.hasParameter);
            if (!!line && !line.parameterValue.includes(':')) {
                symbolsForObject = passDetails.symbols.find(s => s.objectName === line.parameterValue.trim());
            }
        }
        if (!!symbolsForObject && isImported) {
            const blockSymbol = symbolsForObject.symbols.find(s => s.kind === ObjectSymbolKind.FirstClassBlockLabel && s.name === blockName);
            if (!!blockSymbol) {
                if (blockSymbol.value === 'deferred') {
                    value = 'deferred';
                } else {
                    if (!!passDetails.baseAddressOffset) {
                        value = blockSymbol.value.computeSum(passDetails.baseAddressOffset);
                    } else {
                        value = blockSymbol.value;
                    }
                }
            }
        }

        return value;
    }

    private static findEmbeddedBlockAddress(passDetails: PassDetails, fromLineIndex: number, embeddedBlockName: string): DynamicByteSequence | 'deferred' | null {
        let value: DynamicByteSequence | 'deferred' | null = null;
        if (!!passDetails.blockLocationMap) {
            const embeddedBlockTarget = passDetails.blockLocationMap.getEmbeddedBlock(embeddedBlockName, fromLineIndex);
            if (!!embeddedBlockTarget) {
                if (!!passDetails.baseAddressOffset) {
                    value = passDetails.baseAddressOffset.computeSum(embeddedBlockTarget.nominalAddress);
                } else {
                    value = ByteSequenceCreator.QuadByte(embeddedBlockTarget.nominalAddress);
                }
            }
        } else {
            value = 'deferred';
        }
        
        return value;
    }

    private static readonly _MAX_TRI_BYTE_VALUE = Math.pow(2, 24) - 1;
}