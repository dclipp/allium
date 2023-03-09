import { Token } from '../../stage-1/token';
import { MnemonicHelper } from '@allium/types';
import { AsmMessageHelper } from '../../../../messages/asm-message-helper';
import { ASM_MESSAGES } from '../../../../messages/asm-messages';
import { MessageList } from '../../../../messages/message-list';

export class S2MnemonicParser {
    public static parseMnemonic(instructionLineTokens: Array<Token>): { mnemonicTokenIndex: number, messages: MessageList } {
        const messages = new MessageList();
        let mnemonicTokenIndex = Number.NaN;

        if (instructionLineTokens.length > 0) {
            const mnemonicToken = instructionLineTokens[0];
            const mnemonicParseResult = MnemonicHelper.parseMnemonicFromString(mnemonicToken.text);
            if (mnemonicParseResult.mnemonic === undefined) {
                if (mnemonicParseResult.isCaseCorrectable) {
                    messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.BadMnemonicCasing, {
                        startPosition: mnemonicToken.startPosition,
                        endPosition: mnemonicToken.endPosition
                    }));
                } else {
                    messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.UnrecognizedMnemonic, {
                        startPosition: mnemonicToken.startPosition,
                        endPosition: mnemonicToken.endPosition
                    }));
                }
            } else {
                mnemonicTokenIndex = instructionLineTokens[0].index;
            }
        } else {
            messages.addDistinct(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.Stage2.MissingMnemonic));
        }

        return {
            mnemonicTokenIndex: mnemonicTokenIndex,
            messages: messages
        }
    }
}