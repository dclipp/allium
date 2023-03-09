import { Stage1Object } from './stage-1-object';
import { StageParserOutput } from '../stage-parser-output';
import { Token } from './token';
import { ASM_MESSAGES } from '../../../messages/asm-messages';
import { MessageList } from '../../../messages/message-list';
import { StageParser } from '../stage-parser';
import { WorkingParserPayload } from '../../shared/parser-types/internal-payload/working-parser-payload';

class Stage1Parser {
    public static parse(workingPayload: WorkingParserPayload): StageParserOutput<Stage1Object> {
        const tokens = new Array<Token>();
        const messages = new MessageList();

        if (!!workingPayload.sourceContent) {
            let tokenBuffer = '';
            let tokenStartPosition = 0;

            for (let i = 0; i < workingPayload.sourceContent.length; i++) {
                const current = workingPayload.sourceContent.charAt(i);
                if (Stage1Parser.isWhitespaceCharacter(current)) {
                    if (tokenBuffer.length > 0) {
                        tokens.push({
                            index: tokens.length,
                            startPosition: tokenStartPosition,
                            endPosition: i,
                            length: i - tokenStartPosition,
                            text: tokenBuffer
                        })
                    }
                    tokenStartPosition = i + 1;
                    tokenBuffer = '';
                } else {
                    tokenBuffer += current;
                }
            }

            if (tokenBuffer.length > 0) {
                tokens.push({
                    index: tokens.length,
                    startPosition: tokenStartPosition,
                    endPosition: workingPayload.sourceContent.length,
                    length: workingPayload.sourceContent.length - tokenStartPosition,
                    text: tokenBuffer
                })
            }
        } else {
            messages.addDistinct({
                code: ASM_MESSAGES.Parser.Stage1.NullOrEmptyContent.code,
                classification: ASM_MESSAGES.Parser.Stage1.NullOrEmptyContent.classification
            })
        }

        return {
            object: {
                tokens: tokens
            },
            messages: messages
        }
    }

    private static isWhitespaceCharacter(ch: string): boolean {
        return [' ', '\t', '\n', '\r'].includes(ch);
    }
}

export const parseStage1: StageParser<Stage1Object> = Stage1Parser.parse;