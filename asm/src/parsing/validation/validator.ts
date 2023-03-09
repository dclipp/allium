import { PassOutput } from '../passes/pass-output';
import { MessageList } from '../../messages/message-list';
import { S3InstructionLine } from '../stages/stage-3/s3-instruction-line';
import { MnemonicHelper, Mnemonic, RegisterHelper } from '@allium/types';
import { AsmMessage } from '../../messages/asm-message';
import { AsmMessageHelper } from '../../messages/asm-message-helper';
import { ASM_MESSAGES } from '../../messages/asm-messages';
import { Token } from '../stages/stage-1/token';
import { S3InstructionArg } from '../stages/stage-3/instruction/s3-instruction-arg';
import { InstructionArgumentKind } from '../shared/kinds/instruction-argument-kind';
import { ConstantInjectionKind } from '../shared/constant-injector/constant-injection-kind';
import { DirectiveValidator } from './directive-validator';
import { ParseOptions } from '../parse-options';

export class Validator {
    public static validatePassOutput(passOutput: PassOutput): MessageList {
        const messages = new MessageList();

        passOutput.stage3.instructionLines.forEach(il => {
            Validator.validateInstruction(passOutput.stage1.tokens, il).toArray().forEach(m => {
                if (!passOutput.messages.includesFailureMessageForCoordinates(m.contentCoordinates)) {
                    messages.addDistinct(m);
                }
            })
        })

        passOutput.stage3.labelLines.forEach((ln, lni, arr) => {
            const nextLabelLine = arr[lni + 1];
            const instructionLinesForBlock = passOutput.stage3.instructionLines.filter(il => il.lineIndex > ln.lineIndex && (!(!!nextLabelLine) || il.lineIndex < nextLabelLine.lineIndex));
            const startToken = passOutput.stage1.tokens.find(t => t.index === ln.nameTokenIndex);
            const structuralLabelLine = passOutput.stage2.labelLines.find(tln => tln.lineIndex === ln.lineIndex);
            const endToken = passOutput.stage1.tokens.find(t => t.index === (!!structuralLabelLine ? structuralLabelLine.tokenIndices.last() : ln.nameTokenIndex));
            
            messages.merge(Validator.validateBlock(instructionLinesForBlock, !!startToken ? startToken.startPosition : -1, !!endToken ? endToken.endPosition : -1));
        })

        messages.merge(DirectiveValidator.validate(passOutput));

        return messages;
    }

    public static validateOptions(options: ParseOptions): MessageList {
        const messages = new MessageList();
        if (options.baseAddressOffset !== undefined) {
            if (!(Number.isInteger(options.baseAddressOffset) && options.baseAddressOffset >= 0 && options.baseAddressOffset < Math.pow(2, 24))) {
                messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Validation.Options.InvalidBaseAddressOffset));
            }
        }

        return messages;
    }

    private static validateInstruction(allTokens: Array<Token>, line: S3InstructionLine): MessageList {
        const messages = new MessageList();
        const startToken = !!line.mnemonic ? allTokens.find(t => t.index === line.mnemonic.tokenIndices[0]) : undefined;
        const endToken = !!line.mnemonic ? allTokens.find(t => t.index === (line.argumentList.length > 0 ? line.argumentList.last().tokenIndices.last() : line.mnemonic.tokenIndices[0])) : undefined;
        const argCountValidation: AsmMessage | 'valid' = !!line.mnemonic ? Validator.validateInstructionArgCount(
            line.mnemonic.mnemonic,
            line.argumentList.length,
            !!startToken ? startToken.startPosition : -1,
            !!endToken ? endToken.endPosition : -1)
            : 'valid';
        if (argCountValidation === 'valid') {
            if (line.argumentList.length > 0) {
                line.argumentList.forEach((a, i) => {
                    const argStartToken = allTokens.find(t => t.index === a.tokenIndices[0]);
                    const argEndToken = allTokens.find(t => t.index === a.tokenIndices.last());
                    const argStartPosition = !!argStartToken ? argStartToken.startPosition : -1;
                    const argEndPosition = !!argEndToken ? argEndToken.endPosition : -1;
                    const argValidation = Validator.validateArgType(line.mnemonic.mnemonic, a, i, argStartPosition, argEndPosition);
                    if (argValidation !== 'valid') {
                        messages.addDistinct(argValidation);
                    }
                })
            }
        } else {
            messages.addDistinct(argCountValidation);
        }

        return messages;
    }

    private static validateInstructionArgCount(mnemonic: Mnemonic, argCount: number, startPosition: number, endPosition: number): AsmMessage | 'valid' {
        let isValid = false;

        switch (argCount) {
            case 0:
                isValid = MnemonicHelper.opArgs.isZeroArgOp(mnemonic);
                break;
            case 1:
                isValid = MnemonicHelper.opArgs.isImplicitAccumulatorOp(mnemonic)
                    || MnemonicHelper.opArgs.isOneRegisterOp(mnemonic)
                    || MnemonicHelper.opArgs.isInlineQuadByteOp(mnemonic)
                    || MnemonicHelper.opArgs.isInlineTriByteOp(mnemonic)
                    || MnemonicHelper.opArgs.isInlineDoubleByteOp(mnemonic)
                    || MnemonicHelper.opArgs.isInlineByteOp(mnemonic);
                break;
            case 2:
                isValid = MnemonicHelper.opArgs.isTwoRegisterOp(mnemonic)
                    || MnemonicHelper.opArgs.isRegisterAndByteOp(mnemonic)
                    || MnemonicHelper.opArgs.isRegisterAndDoubleByteOp(mnemonic)
                    || MnemonicHelper.opArgs.isRegisterAndTriByteOp(mnemonic);
                break;
            case 3:
                isValid = MnemonicHelper.opArgs.isThreeRegisterOp(mnemonic);
                break;
            default:
                isValid = false;
                break;
        }

        if (isValid) {
            return 'valid';
        } else {
            return AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Validation.Instructions.ArgumentCountMismatch, {
                startPosition: startPosition,
                endPosition: endPosition
            });
        }
    }

    private static validateArgType(mnemonic: Mnemonic, instructionArg: S3InstructionArg, argIndex: number,
        startPosition: number, endPosition: number): AsmMessage | 'valid' {
        let isValid: boolean | 'valid' | AsmMessage = false;

        switch (instructionArg.determinedKind) {
            case InstructionArgumentKind.RegisterRef:
                isValid = MnemonicHelper.isVariableRegister1Op(mnemonic) && argIndex === 0
                    || MnemonicHelper.isVariableRegister2Op(mnemonic) && argIndex === 1
                    || MnemonicHelper.isVariableRegister3Op(mnemonic) && argIndex === 2;
                break;
            case InstructionArgumentKind.InlineValue:
            case InstructionArgumentKind.AutoAddressRef:
                isValid = MnemonicHelper.isInlineQuadValueOp(mnemonic) && argIndex === 0
                    || MnemonicHelper.isInlineLessThanQuadValueOp(mnemonic) && argIndex > 0;
                break;
            case InstructionArgumentKind.ConstantInjector:
                isValid = Validator.validateConstantInjectorArgType(mnemonic, instructionArg.asConstantInjector().injectionKind, argIndex, startPosition, endPosition);
                break;
            case InstructionArgumentKind.AliasRef:
            case InstructionArgumentKind.Unknown:
                isValid = true;
                break;
        }

        if (isValid === true || isValid === 'valid') {
            return 'valid';
        } else if (isValid === false) {
            return AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Validation.Instructions.ArgumentTypeMismatch, {
                startPosition: startPosition,
                endPosition: endPosition
            })
        } else {
            return isValid;
        }
    }

    private static validateConstantInjectorArgType(mnemonic: Mnemonic, injectionKind: ConstantInjectionKind, argIndex: number, startPosition: number, endPosition: number): AsmMessage | 'valid' {
        let isValid: boolean | AsmMessage = false;

        if (injectionKind === ConstantInjectionKind.Flag) {
            isValid = MnemonicHelper.isInlineLessThanQuadValueOp(mnemonic) && argIndex > 0;
        } else if (injectionKind === ConstantInjectionKind.Float) {
            if (argIndex === 0) {
                isValid = Validator.quadByteFloatInstructions.includes(mnemonic) || Validator.dualRegRefFloatInstructions.includes(mnemonic);
            } else if (argIndex === 1) {
                isValid = Validator.dualRegRefFloatInstructions.includes(mnemonic);
            }
        } else if (injectionKind === ConstantInjectionKind.Vector) {
            isValid = MnemonicHelper.isVariableRegister1Op(mnemonic) && argIndex < 1
                || MnemonicHelper.isVariableRegister2Op(mnemonic) && argIndex < 2
                || MnemonicHelper.isVariableRegister3Op(mnemonic)
                || MnemonicHelper.isInlineQuadValueOp(mnemonic) && argIndex === 0
                || MnemonicHelper.isInlineLessThanQuadValueOp(mnemonic) && argIndex > 0;
        } else {
            isValid = AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.InvalidConstantInjector, {
                startPosition: startPosition,
                endPosition: endPosition
            });
        }

        if (isValid === true) {
            return 'valid';
        } else if (isValid === false) {
            return AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.InvalidInjectionValue, {
                startPosition: startPosition,
                endPosition: endPosition
            });
        } else {
            return isValid;
        }
    }

    private static isBlockClosureMnemonic(instructionLine: S3InstructionLine, secondOrderRequirements?: {
        readonly requiredRegRefArg: S3InstructionArg;
        readonly requiredMnemonic: Array<Mnemonic>;
    }): boolean {
        const s3Mnemonic = instructionLine.mnemonic;
        if (!!s3Mnemonic) {
            if (Validator.firstOrderClosureMnemonics.includes(s3Mnemonic.mnemonic)) {
                return true;
            } else if (!!secondOrderRequirements) {
                return secondOrderRequirements.requiredMnemonic.includes(s3Mnemonic.mnemonic)
                    && secondOrderRequirements.requiredRegRefArg.determinedKind === InstructionArgumentKind.RegisterRef
                    && instructionLine.argumentList.length > 0
                    && instructionLine.argumentList[0].determinedKind === InstructionArgumentKind.RegisterRef
                    && RegisterHelper.IsReferenceToRegister(secondOrderRequirements.requiredRegRefArg.asRegRef(), instructionLine.argumentList[0].asRegRef(), true);
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    private static validateBlock(instructionLines: Array<S3InstructionLine>, startPosition: number, endPosition: number): MessageList {
        const messages = new MessageList();

        // messages.merge(Validator.checkBlockForDefiniteClosure(instructionLines, startPosition, endPosition));

        return messages;
    }

    /** Returns the BlockFallThrough message if the block is not empty and does not have a definite closure */
    private static checkBlockForDefiniteClosure(instructionLines: Array<S3InstructionLine>, startPosition: number, endPosition: number): MessageList {
        const messages = new MessageList();

        if (instructionLines.length > 0) {
            let index = instructionLines.length - 1;
            const line = instructionLines[index];
            if (!Validator.isBlockClosureMnemonic(line)) {
                let hasDefiniteClosure = false;

                // If line is not the first instruction, check to see if there is a guaranteed
                // closure sequence. This occurs when both line and line + 1 conditionally close
                // the block, and the closing conditions of each line are guaranteed to be exact opposites
                // ex:
                //  BlockA:
                //      JZ [MONDAY] [TUESDAY]
                //      JNZ [MONDAY] [TUESDAY]
                //  If [MONDAY] is zero, then the block is closed because JZ will perform the jump
                //  If JNZ is reached, we know that [MONDAY] cannot be zero, and therefore the
                //  block is closed because the JNZ instruction will perform the jump
                if (index > 0 && !!line.mnemonic) {
                    index--;
                    const penultimateLine = instructionLines[index];
                    const requiredMnemonics = Validator.secondOrderClosureMnemonics.find(x => x.order1 === line.mnemonic.mnemonic);
                    if (line.argumentList.length > 0 && !!requiredMnemonics) {
                        hasDefiniteClosure = Validator.isBlockClosureMnemonic(penultimateLine, {
                            requiredRegRefArg: line.argumentList[0],
                            requiredMnemonic: requiredMnemonics.order2
                        });
                    }
                }

                if (!hasDefiniteClosure) {
                    messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Validation.Blocks.BlockFallThrough, {
                        startPosition: startPosition,
                        endPosition: endPosition
                    }))
                }
            }
        }

        return messages;
    }

    /** A block is always exited after execution of these mnemonics */
    private static readonly firstOrderClosureMnemonics: ReadonlyArray<Mnemonic> = [
        Mnemonic.END,
        Mnemonic.JMP,
        Mnemonic.JMPI
    ]

    /**
     * Given a mnemonic *order1*, a block is exited after execution of
     * any of the mnemonics in *order2*, as long as the first argument of
     * both *order1* and *order2* is the same, and the instruction of
     * *order2* is executed immediately after the instruction of *order1*
    */
    private static readonly secondOrderClosureMnemonics: ReadonlyArray<{ order1: Mnemonic, order2: Array<Mnemonic> }> = [
        {
            order1: Mnemonic.JNZ,
            order2: [Mnemonic.JZ, Mnemonic.JZI]
        },
        {
            order1: Mnemonic.JNZI,
            order2: [Mnemonic.JZ, Mnemonic.JZI]
        },
        {
            order1: Mnemonic.JZ,
            order2: [Mnemonic.JNZ, Mnemonic.JNZI]
        },
        {
            order1: Mnemonic.JZI,
            order2: [Mnemonic.JNZ, Mnemonic.JNZI]
        }
    ]

    private static readonly quadByteFloatInstructions: ReadonlyArray<Mnemonic> = [
        Mnemonic.ADDF,
        Mnemonic.SUBF,
        Mnemonic.MULTF,
        Mnemonic.DIVF,
        Mnemonic.LOAD_MONDAY,
        Mnemonic.LOAD_TUESDAY,
        Mnemonic.LOAD_WEDNESDAY,
        Mnemonic.LOAD_THURSDAY,
        Mnemonic.LOAD_FRIDAY,
        Mnemonic.LOAD_ACCUMULATOR,
        Mnemonic.LOAD_INSPTR,
        Mnemonic.LOAD_G7,
        Mnemonic.LOAD_G8,
        Mnemonic.LOAD_G9,
        Mnemonic.LOAD_G10,
        Mnemonic.LOAD_G11,
        Mnemonic.LOAD_G12,
        Mnemonic.LOAD_G13,
        Mnemonic.LOAD_G14,
        Mnemonic.LOAD_STKPTR
    ]

    private static readonly dualRegRefFloatInstructions: ReadonlyArray<Mnemonic> = [
        Mnemonic.FLOORF,
        Mnemonic.CEILF,
        Mnemonic.ROUNDF
    ]
}