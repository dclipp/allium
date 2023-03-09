import { PassOutput } from '../passes/pass-output';
import { MessageList } from '../../messages/message-list';
import { AsmMessageHelper } from '../../messages/asm-message-helper';
import { ASM_MESSAGES } from '../../messages/asm-messages';
import { DirectiveCommand } from '../shared/directive/directive-command';

export class DirectiveValidator {
    public static validate(passOutput: PassOutput): MessageList {
        const messages = new MessageList();

        const coordinateMap = new Map<number, [number, number]>();
        passOutput.stage2.directiveLines
            .forEach(dl => {
                const startToken = passOutput.stage1.tokens[dl.tokenIndices[0]];
                const endToken = passOutput.stage1.tokens[dl.tokenIndices.last()];
                if (!!startToken && !!endToken) {
                    coordinateMap.set(dl.lineIndex, [startToken.startPosition, endToken.endPosition]);
                }
            })

        const firstBlockLineIndex = DirectiveValidator.getFirstBlockLineIndex(passOutput);

        // Check for duplicates
        messages.merge(DirectiveValidator.checkForDuplicateParamNames(passOutput, coordinateMap, firstBlockLineIndex));
        
        // Check for section boundaries
        messages.merge(DirectiveValidator.checkForUnclosedSections(passOutput, coordinateMap));
        messages.merge(DirectiveValidator.checkForUnopenedSections(passOutput, coordinateMap));

        return messages;
    }

    private static getFirstBlockLineIndex(passOutput: PassOutput): number {
        let lineIndex = -1;
        if (passOutput.stage4.labelLines.length > 0) {
            lineIndex = passOutput.stage4.labelLines.sort((a, b) => a.lineIndex - b.lineIndex)[0].lineIndex;
        }
        return lineIndex;
    }

    private static getSiblingLineIndexRange(passOutput: PassOutput, lineIndex: number): {
        readonly minLineIndex: number;
        readonly maxLineIndex: number;
    } {
        let minLineIndex = -1;
        let maxLineIndex = -1;

        if (passOutput.stage4.labelLines.length > 0) {
            const labelLine = passOutput.stage4.labelLines.find((ln, lni, lna) => {
                return ln.lineIndex < lineIndex && !lna.some(ln2 => ln2.lineIndex < lineIndex && ln.lineIndex - ln2.lineIndex < 0);
            })

            if (!!labelLine) {
                minLineIndex = labelLine.lineIndex + 1;
                const nextLabelLine = passOutput.stage4.labelLines.find(ln => ln.lineIndex > labelLine.lineIndex);
                if (!!nextLabelLine) {
                    maxLineIndex = nextLabelLine.lineIndex - 1;   
                }
            }
        }

        return {
            minLineIndex: minLineIndex,
            maxLineIndex: maxLineIndex
        }
    }

    private static checkForDuplicateParamNames(passOutput: PassOutput, coordinateMap: Map<number, [number, number]>, firstBlockLineIndex: number): MessageList {
        const messages = new MessageList();

        // Find duplicated TODO not a duplicate if block-scoped only
        passOutput.stage3.directiveLines
            .filter(dl => dl.command !== DirectiveCommand.Beginsection && dl.command !== DirectiveCommand.Endsection)
            .map((dl, dli, dla) => {
                const isGlobalDirective = dl.lineIndex < firstBlockLineIndex;
                if (isGlobalDirective) {
                    const duplicates = dla.filter(dl2 => dl2.receiverName === dl.receiverName && dl2.lineIndex > dl.lineIndex);
                    if (duplicates.length > 0) {
                        return {
                            messageTemplate: ASM_MESSAGES.Parser.Validation.Directives.DuplicateDirectiveRedeclaresGlobal,
                            indices: duplicates.map(d => d.lineIndex)
                        };
                    } else {
                        return null;
                    }
                } else {
                    const siblingLineIndexRange = DirectiveValidator.getSiblingLineIndexRange(passOutput, dl.lineIndex);
                    const duplicateSiblings = dla.filter(dl2 => dl2.lineIndex !== dl.lineIndex && dl2.lineIndex >= siblingLineIndexRange.minLineIndex
                        && (siblingLineIndexRange.maxLineIndex === -1 || dl2.lineIndex <= siblingLineIndexRange.maxLineIndex)
                        && dl2.receiverName === dl.receiverName);
                    if (duplicateSiblings.length > 0) {
                        return {
                            messageTemplate: ASM_MESSAGES.Parser.Validation.Directives.DuplicateDirective,
                            indices: duplicateSiblings.map(d => d.lineIndex)
                        };
                    } else {
                        return null;
                    }
                }
            })
            .filter(liArr => !!liArr)
            .forEach(liArr => {
                liArr.indices.forEach(li => {
                    const coordinates = coordinateMap.has(li)
                        ? coordinateMap.get(li)
                        : null;
                    messages.addDistinct(AsmMessageHelper.generateMessage(
                        liArr.messageTemplate,
                        !!coordinates ?
                        {
                            startPosition: coordinates[0],
                            endPosition: coordinates[1]
                        }
                        : undefined
                    ));
                })
            })

        return messages;
    }

    private static checkForUnclosedSections(passOutput: PassOutput, coordinateMap: Map<number, [number, number]>): MessageList {
        const messages = new MessageList();

        passOutput.stage3.directiveLines
            .forEach((dl, dli, dla) => {
                if (dl.command === DirectiveCommand.Beginsection) {
                    const subsequentDirectiveLines = dla
                        .filter(dl2 => dl2.receiverName === dl.receiverName && dl2.lineIndex > dl.lineIndex)
                        .sort((a, b) => a.lineIndex - b.lineIndex);

                    if (subsequentDirectiveLines.length === 0 || subsequentDirectiveLines[0].command !== DirectiveCommand.Endsection) {
                        const coordinates = coordinateMap.has(dl.lineIndex)
                            ? coordinateMap.get(dl.lineIndex)
                            : null;
                        messages.addDistinct(AsmMessageHelper.generateMessage(
                            ASM_MESSAGES.Parser.Validation.Directives.UnclosedSectionDirective,
                            !!coordinates ?
                            {
                                startPosition: coordinates[0],
                                endPosition: coordinates[1]
                            }
                            : undefined
                        ));
                    }
                }
            })

        return messages;
    }

    private static checkForUnopenedSections(passOutput: PassOutput, coordinateMap: Map<number, [number, number]>): MessageList {
        const messages = new MessageList();

        passOutput.stage3.directiveLines
            .forEach((dl, dli, dla) => {
                if (dl.command === DirectiveCommand.Endsection) {
                    const subsequentDirectiveLines = dla
                        .filter(dl2 => dl2.receiverName === dl.receiverName && dl2.lineIndex > -1 && dl2.lineIndex < dl.lineIndex)
                        .sort((a, b) => b.lineIndex - a.lineIndex);

                    if (subsequentDirectiveLines.length === 0 || subsequentDirectiveLines[0].command !== DirectiveCommand.Beginsection) {
                        const coordinates = coordinateMap.has(dl.lineIndex)
                            ? coordinateMap.get(dl.lineIndex)
                            : null;
                        messages.addDistinct(AsmMessageHelper.generateMessage(
                            ASM_MESSAGES.Parser.Validation.Directives.UnopenedSectionDirective,
                            !!coordinates ?
                            {
                                startPosition: coordinates[0],
                                endPosition: coordinates[1]
                            }
                            : undefined
                        ));
                    }
                }
            })

        return messages;
    }
}