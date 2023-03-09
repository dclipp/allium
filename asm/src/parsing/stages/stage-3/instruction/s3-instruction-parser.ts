import { S2InstructionLine } from '../../stage-2/instruction/s2-instruction-line';
import { Token } from '../../stage-1/token';
import { S3InstructionLine } from '../s3-instruction-line';
import { S3Mnemonic } from './s3-mnemonic';
import { MnemonicHelper, RegisterHelper, Register, RegisterMask, VariableRegisterReference, FlagName, RealNumber, NamedRegisterMask } from '@allium/types';
import { S3InstructionArg } from './s3-instruction-arg';
import { S2InstructionArgument } from '../../stage-2/instruction/s2-instruction-argument';
import { S3RegisterRefArg } from './s3-register-ref-arg';
import { InstructionArgumentKind } from '../../../shared/kinds/instruction-argument-kind';
import { S3InlineValueArg } from './s3-inline-value-arg';
import { S3ConstantInjectorArg } from './s3-constant-injector-arg';
import { ConstantInjectionKind, ConstantInjectionKindMap } from '../../../shared/constant-injector/constant-injection-kind';
import { S3DirectiveRefArg } from './s3-directive-ref-arg';
import { AsmMessageClassification } from '../../../../messages/asm-message-classification';
import { AsmMessageHelper } from '../../../../messages/asm-message-helper';
import { ASM_MESSAGES } from '../../../../messages/asm-messages';
import { ParseOptions } from '../../../parse-options';
import { MessageList } from '../../../../messages/message-list';
import { S3AutoAddressRefArg } from './s3-auto-address-ref-arg';
import { AutoAddressRefKind } from '../../../shared/auto-address-ref/auto-address-ref-kind';
import { AutoAddressRefParser } from '../../../shared/auto-address-ref/auto-address-ref-parser';
import { ObjectSymbol } from '../../../shared/symbol/object-symbol';
import { S3DirectiveLine } from '../directive/s3-directive-line';
import { DirectiveCommand } from '../../../shared/directive/directive-command';
import { Stage1Object } from '../../stage-1/stage-1-object';

export class S3InstructionParser {
    public static parseInstructionLine(stage1Object: Stage1Object, instructionLine: S2InstructionLine, symbols: Array<ObjectSymbol>, directiveLines: Array<S3DirectiveLine>, options: ParseOptions): {
        line: S3InstructionLine,
        messages: MessageList
    } {
        const allTokens = stage1Object.tokens;
        const messages = new MessageList();
        const args = new Array<S3InstructionArg>();
        const mnemonicResult = S3InstructionParser.parseMnemonic(allTokens, instructionLine);
        let mnemonic: S3Mnemonic = undefined;
        messages.merge(mnemonicResult.messages);
        if (mnemonicResult.mnemonic !== undefined) {
            mnemonic = mnemonicResult.mnemonic;

            // const argTokens = allTokens.filter(t => t.index !== instructionLine.mnemonicTokenIndex && instructionLine.tokenIndices.includes(t.index));
            if (instructionLine.argumentList.length > 0 && !instructionLine.argumentList.some(a => a.assumedArgKind === InstructionArgumentKind.Unknown)) {
                instructionLine.argumentList.forEach(a => {
                    // const argTokens = allTokens.filter(t => a.tokenIndices.includes(t.index));
                    const parsedArg = S3InstructionParser.parseInstructionArg(stage1Object, a, symbols, directiveLines, options);
                    messages.merge(parsedArg.messages);
                    args.push(parsedArg.arg);
                })
            }
        }

        return {
            line: {
                mnemonic: mnemonic,
                argumentList: args,
                lineIndex: instructionLine.lineIndex
            },
            messages: messages
        }
    }

    public static tryParseArgument(tokensForArg: Array<Token>, lineIndex: number, globalInstructionCount: number, options: ParseOptions) : { arg: S3InstructionArg, messages: MessageList } | 'invalid' {
        const orderedArgParsers = [{
            fn: (tokens: Array<Token>) => { return S3InstructionParser.tryGetRegRefArg(tokens, lineIndex) }
        }, {
            fn: (tokens: Array<Token>) => { return S3InstructionParser.tryGetInlineValueArg(tokens, lineIndex, options) }
        }, {
            fn: (tokens: Array<Token>) => { return S3InstructionParser.tryGetConstantInjectorArg(tokens, lineIndex) }
        }, {
            fn: (tokens: Array<Token>) => { return S3InstructionParser.tryGetAutoAddressRefArg(tokens, lineIndex) }
        }];
        
        let parserIndex = 0;
        let result: { arg: S3InstructionArg; messages: MessageList; } = null;

        while (parserIndex < orderedArgParsers.length && (result === null || result.messages.hasFailureMessages )) {
            result = orderedArgParsers[parserIndex].fn(tokensForArg);
            parserIndex++;
        }

        if (result.messages.hasFailureMessages) {
                return 'invalid';
            } else {
                return result;
            }
    }

    private static parseMnemonic(allTokens: Array<Token>, instructionLine: S2InstructionLine): { mnemonic?: S3Mnemonic, messages: MessageList } {
        const messages = new MessageList();
        const mnemonicToken = allTokens[instructionLine.mnemonicTokenIndex];
        if (!!mnemonicToken) {
            const parsedMnemonic = MnemonicHelper.parseMnemonicFromString(mnemonicToken.text);
            if (parsedMnemonic.mnemonic === undefined) {
                messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.MissingMnemonic, {
                    startPosition: allTokens[instructionLine.tokenIndices[0]].startPosition,
                    endPosition: allTokens[instructionLine.tokenIndices.last()].endPosition
                }))
            } else {
                return {
                    mnemonic: {
                        mnemonic: parsedMnemonic.mnemonic,
                        tokenIndices: [mnemonicToken.index],
                        lineIndex: instructionLine.lineIndex,
                        asMnemonic: () => { return parsedMnemonic.mnemonic },
                        asRegRef: () => { throw new Error('Type mismatch') },
                        asInlineValue: () => { throw new Error('Type mismatch') },
                        asConstantInjector: () => { throw new Error('Type mismatch') },
                        asAutoAddressRef: () => { throw new Error('Type mismatch') },
                        asAliasRef: () => { throw new Error('Type mismatch') },
                    },
                    messages: messages
                }
            }
        } else {
            return {
                messages: messages
            }
        }
    }

    private static parseInstructionArg(stage1Object: Stage1Object, instructionArg: S2InstructionArgument,
        symbols: Array<ObjectSymbol>, directiveLines: Array<S3DirectiveLine>, options: ParseOptions): { arg: S3InstructionArg, messages: MessageList } {
        const allTokens = stage1Object.tokens;
        const tokensForArg = allTokens.filter(t => instructionArg.tokenIndices.includes(t.index));
        if (instructionArg.assumedArgKind === InstructionArgumentKind.RegisterRef) {
            return S3InstructionParser.tryGetRegRefArg(tokensForArg, instructionArg.lineIndex);
        } else if (instructionArg.assumedArgKind === InstructionArgumentKind.InlineValue) {
            return S3InstructionParser.tryGetInlineValueArg(tokensForArg, instructionArg.lineIndex, options);
        } else if (instructionArg.assumedArgKind === InstructionArgumentKind.ConstantInjector) {
            return S3InstructionParser.tryGetConstantInjectorArg(tokensForArg, instructionArg.lineIndex);
        } else if (instructionArg.assumedArgKind === InstructionArgumentKind.AutoAddressRef) {
            return S3InstructionParser.tryGetAutoAddressRefArg(tokensForArg, instructionArg.lineIndex);
        } else if (instructionArg.assumedArgKind === InstructionArgumentKind.AliasRef) {
            return S3InstructionParser.tryGetAliasRefArg(tokensForArg, instructionArg.lineIndex, symbols, directiveLines);
        }
    }

    private static tryGetRegRefArg(tokens: Array<Token>, lineIndex: number): { arg: S3RegisterRefArg, messages: MessageList } {
        const messages = new MessageList();
        let register: Register = undefined;
        let mask: RegisterMask = undefined;
        let hasMask = false;
        const fullText = tokens.map(t => t.text).reduce((x, y) => x + y, '');
        const fullTextNoBrackets = fullText.replace('[', '').replace(']', '').trim();
        const nameText = fullTextNoBrackets.includes('.') ? fullTextNoBrackets.split('.')[0].trim() : fullTextNoBrackets;
        const maskText = fullTextNoBrackets.includes('.') ? fullTextNoBrackets.split('.')[1].trim() : '';
        const parsedRegName = RegisterHelper.parseRegisterNameFromString(nameText);
        const tokenIndexOfDot = fullTextNoBrackets.includes('.') ? tokens.findIndex(t => t.text.includes('.')) : -1;
        if (parsedRegName === undefined) {
            messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.InvalidRegisterName,
                {
                    startPosition: tokens[0].startPosition,
                    endPosition: tokenIndexOfDot > -1 ? tokens[tokenIndexOfDot].startPosition + tokens[tokenIndexOfDot].text.indexOf('.') : tokens.last().endPosition
                }))
        } else {
            register = parsedRegName;
        }

        if (!!maskText) {
            hasMask = true;
            const parsedNamedMask = RegisterHelper.parseNamedRegisterMaskFromString(maskText);
            if (parsedNamedMask === undefined) {
                const parsedMask = RegisterHelper.parseRegisterMaskFromString(maskText);
                if (parsedMask === undefined) {
                    messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.InvalidNumericRegisterMask, {
                        startPosition: tokens[tokenIndexOfDot].text.indexOf('.'),
                        endPosition: tokens.last().endPosition
                    }))
                } else {
                    mask = parsedMask;
                }

                if (mask === undefined) {
                    messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.InvalidNamedRegisterMask, {
                        startPosition: tokens[tokenIndexOfDot].text.indexOf('.'),
                        endPosition: tokens.last().endPosition
                    }))
                }
            } else if (parsedNamedMask !== NamedRegisterMask.Unnamed) {
                mask = RegisterMask(parsedNamedMask);
            }
        }

        return {
            arg: {
                register: register,
                mask: mask,
                hasMask: hasMask,
                determinedKind: InstructionArgumentKind.RegisterRef,
                tokenIndices: tokens.map(t => t.index),
                lineIndex: lineIndex,
                asMnemonic: () => { throw new Error('Type mismatch') },
                asRegRef: () => { return VariableRegisterReference.create(register, mask) },
                asInlineValue: () => { throw new Error('Type mismatch') },
                asConstantInjector: () => { throw new Error('Type mismatch') },
                asAutoAddressRef: () => { throw new Error('Type mismatch') },
                asAliasRef: () => { throw new Error('Type mismatch') }
            },
            messages: messages
        }
    }

    private static tryGetInlineValueArg(tokens: Array<Token>, lineIndex: number, options: ParseOptions): { arg: S3InlineValueArg, messages: MessageList } {
        const messages = new MessageList();
        const fullText = tokens.map(t => t.text).reduce((x, y) => x + y, '');
        const numericValue = Number.parseInt(fullText);//TODO hex prefix ?

        if (!Number.isInteger(numericValue)) {
            messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Common.UnexpectedCaseForView, {
                startPosition: tokens[0].startPosition,
                endPosition: tokens.last().endPosition
            }))
        } else if (numericValue > Math.pow(2, 32) - 1) {
            let message = AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.InlineValueTooLarge, {
                startPosition: tokens[0].startPosition,
                endPosition: tokens.last().endPosition
            });
            if (options.treatOversizedInlineValuesAsWarnings) {
                message = AsmMessageHelper.reclassifyMessage(message, AsmMessageClassification.Warning);
            }
            messages.addDistinct(message);
        }

        return {
            arg: {
                numericValue: numericValue,
                determinedKind: InstructionArgumentKind.InlineValue,
                tokenIndices: tokens.map(t => t.index),
                lineIndex: lineIndex,
                asMnemonic: () => { throw new Error('Type mismatch') },
                asRegRef: () => { throw new Error('Type mismatch') },
                asInlineValue: () => { return numericValue },
                asConstantInjector: () => { throw new Error('Type mismatch') },
                asAutoAddressRef: () => { throw new Error('Type mismatch') },
                asAliasRef: () => { throw new Error('Type mismatch') }
            },
            messages: messages
        }
    }

    private static tryGetConstantInjectorArg(tokens: Array<Token>, lineIndex: number): { arg: S3ConstantInjectorArg, messages: MessageList } {
        const messages = new MessageList();
        // let register: Register = undefined;
        // let namedMask: RegisterMask = undefined;
        // let hasMask = false;

        let injectionKind: ConstantInjectionKind = undefined;
        let injectionValue: number = undefined;

        const fullText = tokens.map(t => t.text).reduce((x, y) => x + y, '');
        // const fullTextNoBrackets = fullText.replace('[', '').replace(']', '').trim();
        const indexOfEquals = fullText.indexOf('=');
        const keyText = indexOfEquals > -1 ? fullText.replace('@', '').split('=')[0].trim() : fullText.replace('@', '').trim();
        const injectionKindName = Object.keys(ConstantInjectionKindMap).find(k => k === keyText);
        if (!!injectionKindName) {
            injectionKind = ConstantInjectionKindMap[injectionKindName];
        } else {
            const startToken = tokens.find(t => t.text.startsWith('@' + keyText) || t.text.startsWith(keyText));
            const endToken = tokens.find(t => t.text.endsWith(keyText) || t.text.includes(keyText));
            messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.InvalidConstantInjectionKind, {
                startPosition: !!startToken ? startToken.startPosition + startToken.text.indexOf(keyText) : -1,
                endPosition: !!endToken ? endToken.endPosition : -1
            }))
        }
        
        if (indexOfEquals > -1) {
            const valueText = fullText.substring(indexOfEquals + 1);
            const injectionValueDetail = S3InstructionParser.processConstantInjectionValue(
                injectionKind,
                valueText,
                tokens[0].startPosition,
                tokens.last().endPosition);
            messages.merge(injectionValueDetail.messages);
            injectionValue = injectionValueDetail.value;
        }

        return {
            arg: {
                injectionKind: injectionKind,
                injectionValue: injectionValue,
                hasValue: indexOfEquals > -1,
                determinedKind: InstructionArgumentKind.ConstantInjector,
                tokenIndices: tokens.map(t => t.index),
                lineIndex: lineIndex,
                asMnemonic: () => { throw new Error('Type mismatch') },
                asRegRef: () => { throw new Error('Type mismatch') },
                asInlineValue: () => { throw new Error('Type mismatch') },
                asConstantInjector: () => { return { injectionKind: injectionKind, hasValue: indexOfEquals > -1, injectionValue: injectionValue } },
                asAutoAddressRef: () => { throw new Error('Type mismatch') },
                asAliasRef: () => { throw new Error('Type mismatch') }
            },
            messages: messages
        }
    }

    private static tryGetAutoAddressRefArg(tokens: Array<Token>, lineIndex: number): { arg: S3AutoAddressRefArg, messages: MessageList } {
        const fullText = tokens.map(t => t.text).reduce((x, y) => x + y, '');
        const result = AutoAddressRefParser.tryParse(fullText, tokens);

        return {
            arg: {
                kind: result.value.kind,
                blockName: result.value.kind === AutoAddressRefKind.Block
                    ? result.value.blockName
                    : undefined,
                externalObjectName: result.value.kind === AutoAddressRefKind.Block
                    ? result.value.externalObjectName
                    : undefined,
                isExternalBlock: result.value.kind === AutoAddressRefKind.Block
                    ? result.value.isExternalBlock
                    : undefined,
                expression: result.value.kind === AutoAddressRefKind.Relative
                    ? result.value.expression
                    : undefined,
                hasExpression: result.value.kind === AutoAddressRefKind.Relative
                    ? result.value.hasExpression
                    : undefined,
                relativeTo: result.value.kind === AutoAddressRefKind.Relative
                    ? result.value.relativeTo
                    : undefined,
                literal: result.value.kind === AutoAddressRefKind.Invalid
                    ? result.value.literal
                    : undefined,
                determinedKind: InstructionArgumentKind.AutoAddressRef,
                tokenIndices: tokens.map(t => t.index),
                lineIndex: lineIndex,
                asMnemonic: () => { throw new Error('Type mismatch') },
                asRegRef: () => { throw new Error('Type mismatch') },
                asInlineValue: () => { throw new Error('Type mismatch') },
                asConstantInjector: () => { throw new Error('Type mismatch') },
                asAutoAddressRef: () => { return result.value },
                asAliasRef: () => { throw new Error('Type mismatch') }
            } as S3AutoAddressRefArg,
            messages: result.messages
        }
    }

    private static tryGetAliasRefArg(tokens: Array<Token>, lineIndex: number, symbols: Array<ObjectSymbol>, directiveLines: Array<S3DirectiveLine>): { arg: S3DirectiveRefArg, messages: MessageList } {
        const messages = new MessageList();
        const fullText = tokens.map(t => t.text).reduce((x, y) => x + y, '');
        const searchName = fullText.replace('#', '').trim();
        const symbol = symbols.find(s => s.name === searchName);
        let aliasName = undefined;
        if (!!symbol) {
            aliasName = symbol.name;
        } else {
            const line = directiveLines.find(dl => dl.command === DirectiveCommand.Import && (dl.isImplicitImport || dl.receiverName === searchName));
            if (!!line) {
                aliasName = line.receiverName;
            } else {
                messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.AliasNotFound, {
                    startPosition: tokens[0].startPosition,
                    endPosition: tokens.last().endPosition
                }))
            }
        }

        return {
            arg: {
                directiveReceiverName: aliasName,
                determinedKind: InstructionArgumentKind.AliasRef,
                tokenIndices: tokens.map(t => t.index),
                lineIndex: lineIndex,
                asMnemonic: () => { throw new Error('Type mismatch') },
                asRegRef: () => { throw new Error('Type mismatch') },
                asInlineValue: () => { throw new Error('Type mismatch') },
                asConstantInjector: () => { throw new Error('Type mismatch') },
                asAutoAddressRef: () => { throw new Error('Type mismatch') },
                asAliasRef: () => { return { aliasName: aliasName } }
            },
            messages: messages
        }
    }

    private static processConstantInjectionValue(kind: ConstantInjectionKind, valueText: string, startPosition: number, endPosition: number): { value: number, messages: MessageList } {
        const messages = new MessageList();
        let injectionValue: number = undefined;

        if (kind === ConstantInjectionKind.Flag) {
            const injectionIndex = S3InstructionParser._FLAG_INJECTIONS.findIndex(x => x.text === valueText);
            if (injectionIndex > -1) {
                injectionValue = S3InstructionParser._FLAG_INJECTIONS[injectionIndex].value.valueOf();
            } else {
                if (S3InstructionParser._FLAG_INJECTIONS.findIndex(x => x.text === valueText.toUpperCase()) > -1) {
                    messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.FlagInjectionBadCasing, {
                        startPosition: startPosition,
                        endPosition: endPosition
                    }))
                } else {
                    messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.InvalidInjectionValue, {
                        startPosition: startPosition,
                        endPosition: endPosition
                    }))
                }
            }
        } else if (kind === ConstantInjectionKind.Vector) {
            const signedValue = Number.parseInt(valueText);
            if (Number.isInteger(signedValue)) {
                if (signedValue < -1 * Math.pow(2, 31)) {
                    messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.VectorInjectionMagnitudeTooLarge, {
                        startPosition: startPosition,
                        endPosition: endPosition
                    }))
                } else {
                    injectionValue = 0x80000000 + Math.abs(signedValue + 1);
                }
            } else {
                messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.InvalidInjectionValue, {
                    startPosition: startPosition,
                    endPosition: endPosition
                }))
            }
        } else if (kind === ConstantInjectionKind.Float) {
            let succeeded = false;

            try {
                const encodedFloat = RealNumber.encode(Number.parseFloat(valueText));
                if (!encodedFloat.NaN) {
                    const nativeValue = Number.parseInt(encodedFloat.toString({ radix: 2, padZeroes: true }), 2);
                    if (Number.isInteger(nativeValue)) {
                        injectionValue = nativeValue;
                        succeeded = true;
                    }
                }
            } catch {}

            if (!succeeded) {
                messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage3.InvalidInjectionValue, {
                    startPosition: startPosition,
                    endPosition: endPosition
                }))
            }
        }

        return {
            messages: messages,
            value: injectionValue
        }
    }

    private static readonly _FLAG_INJECTIONS = [
        {
            text: 'OVERFLOW',
            value: FlagName.Overflow
        },
        {
            text: 'UNDERFLOW',
            value: FlagName.Underflow
        },
        {
            text: 'OUTOFBOUNDS',
            value: FlagName.OutOfBounds
        },
        {
            text: 'REGISTERSIZEMISMATCH',
            value: FlagName.RegisterSizeMismatch
        },
        {
            text: 'IOREJECTION',
            value: FlagName.IORejection
        },
        {
            text: 'ILLEGALINSTRUCTION',
            value: FlagName.IllegalInstruction
        },
        {
            text: 'ILLEGALARGUMENT',
            value: FlagName.IllegalArgument
        }
    ]
}

// {
//     tokenIndices: Array<number>,
//     asMnemonic: () => { throw new Error('Type mismatch') },
//     asArg: () => { throw new Error('Type mismatch') },
//     asRegRef: () => { throw new Error('Type mismatch') },
//     asInlineValue: () => { throw new Error('Type mismatch') },
//     asConstantInjector: () => { throw new Error('Type mismatch') },
//     asAutoMemRef: () => { throw new Error('Type mismatch') },
//     asAutoLabelRef: () => { throw new Error('Type mismatch') },
//     asDirectiveRef: () => { throw new Error('Type mismatch') },
// }