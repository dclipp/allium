import { AsmMessage } from './asm-message';
import { AsmMessageHelper } from './asm-message-helper';
import { ASM_MESSAGES } from './asm-messages';

export interface ExtendedAsmMessage extends AsmMessage {
    readonly objectName: string;
    readonly lineIndex?: number;
    readonly contentExcerpt?: {
        readonly before: string;
        readonly target: string;
        readonly after: string;
        readonly includesEllipsis?: boolean;
    };
    readonly details?: Array<string>;
}

export class ExtendedAsmMessageHelper {
    public static get ELLIPSIS(): string {
        return '...';
    }
    
    public static get ELLIPSIS_REGEX_SOURCE(): string {
        return '\\.\\.\\.';
    }

    public static createFromAsmMessage(asmMessage: AsmMessage, fileContent: string, objectName: string): ExtendedAsmMessage {
        return {
            code: asmMessage.code,
            classification: asmMessage.classification,
            contentCoordinates: ExtendedAsmMessageHelper.getContentCoordinates(asmMessage.contentCoordinates),
            objectName: objectName,
            contentExcerpt: ExtendedAsmMessageHelper.getContentExcerptForMessage(fileContent, asmMessage.contentCoordinates),
            lineIndex: ExtendedAsmMessageHelper.computeStartLineIndex(fileContent, asmMessage.contentCoordinates) + 1
        }
    }

    public static createGlobalFromAsmMessage(asmMessage: AsmMessage): ExtendedAsmMessage {
        return {
            code: asmMessage.code,
            classification: asmMessage.classification,
            contentCoordinates: ExtendedAsmMessageHelper.getContentCoordinates(asmMessage.contentCoordinates),
            objectName: '@global',
            contentExcerpt: undefined,
            lineIndex: undefined
        }
    }

    public static getDistinctMessages(messages: Array<ExtendedAsmMessage>): Array<ExtendedAsmMessage> {
        const distinctMessages = new Array<ExtendedAsmMessage>();
        messages.forEach(m => {
            if (m.code === ASM_MESSAGES.Parser.GlobalPass.UnresolvedExternal.code) {
                if (messages.length === 1) {
                    distinctMessages.push(m);
                }
            } else {
                if (!distinctMessages.some(dm => {
                    return !!m.contentCoordinates && !!dm.contentCoordinates
                        && dm.contentCoordinates.startPosition <= m.contentCoordinates.startPosition
                        && dm.contentCoordinates.endPosition >= m.contentCoordinates.endPosition;
                })) {
                    distinctMessages.push(m);
                }
            }
        })
        return distinctMessages;
    }

    public static appendDetails(message: ExtendedAsmMessage, details: Array<string>): ExtendedAsmMessage {
        return {
            code: message.code,
            classification: message.classification,
            contentCoordinates: message.contentCoordinates,
            objectName: message.objectName,
            contentExcerpt: message.contentExcerpt,
            lineIndex: message.lineIndex,
            details: details
        }
    }

    public static stringifyMessage(message: ExtendedAsmMessage, options?: {
        readonly excludeClassification?: boolean;
        readonly excludeCode?: boolean;
        readonly excludeDetails?: boolean;
        readonly excludeExcerpt?: boolean;
        readonly excludeLocation?: boolean | {
            readonly excludeObjectName?: boolean;
            readonly excludeLineIndex?: boolean;
            readonly excludeContentCoordinates?: boolean;
        };
        readonly leftPadding?: number;
        readonly locale?: string | Array<string> | { readonly language: string; readonly region: string; };
    }): string {
        // [Critical] (1234) blah blah
        //      at obj1: line 3 15:19
        //      LOAD hEre @flag
        //           ^--|
        //          detail1
        //          detail2

        const hasOptions = !!options;
        const tab = `\t${hasOptions && options.leftPadding !== undefined ? ' '.repeat(options.leftPadding) : ''}`;
        const locale = hasOptions && !!options.locale
            ? typeof options.locale === 'string'
            ? options.locale
            : Array.isArray(options.locale)
            ? `${options.locale[0] || 'default'}_${options.locale[1] || 'default'}`
            : `${options.locale.language || 'default'}_${options.locale.region || 'default'}`
            : 'default_default';
            
        const line1PrefixPart1 = (!hasOptions || options.excludeClassification !== true)
            ? `[${AsmMessageHelper.stringifyClassification(message.classification)}] `
            : '';

        const line1PrefixPart2 = (!hasOptions || options.excludeCode !== true)
            ? `(${message.code}) `
            : '';

        const line1 = `${line1PrefixPart1}${line1PrefixPart2}${AsmMessageHelper.localizeMessage(message.code, locale)}`;

        const locationParts = new Array<string>();
        if (!hasOptions || options.excludeLocation === undefined || options.excludeLocation !== true) {
            const excludeObjectName = !hasOptions || options.excludeLocation === undefined || (typeof options.excludeLocation === 'boolean')
                ? false
                : (options.excludeLocation.excludeObjectName === true);
            const excludeLineIndex = !hasOptions || options.excludeLocation === undefined || (typeof options.excludeLocation === 'boolean')
                ? false
                : (options.excludeLocation.excludeLineIndex === true);
            const excludeContentCoordinates = !hasOptions || options.excludeLocation === undefined || (typeof options.excludeLocation === 'boolean')
                ? false
                : (options.excludeLocation.excludeContentCoordinates === true);

            if (!excludeObjectName) {
                locationParts.push(`${message.objectName}:`);
            }

            if (message.lineIndex !== undefined && !excludeLineIndex) {
                locationParts.push(`line ${message.lineIndex}`);
            }

            if (message.contentCoordinates !== undefined && !excludeContentCoordinates) {
                locationParts.push(`${message.contentCoordinates.startPosition}:${message.contentCoordinates.endPosition}`);
            }
        }

        const line2 = locationParts.length === 0
            ? ''
            : `${tab}at ${locationParts.join(' ')}`;

        let line3 = '';
        let line4 = '';

        if (!(hasOptions && options.excludeExcerpt === true) && message.contentExcerpt !== undefined) {
            const ceBefore = ExtendedAsmMessageHelper.toPrintableContentExcerptSegment(message.contentExcerpt.before, message.contentExcerpt.includesEllipsis !== false, false);
            const ceTarget = ExtendedAsmMessageHelper.toPrintableContentExcerptSegment(message.contentExcerpt.target, message.contentExcerpt.includesEllipsis !== false, true);
            const ceAfter = ExtendedAsmMessageHelper.toPrintableContentExcerptSegment(message.contentExcerpt.after, message.contentExcerpt.includesEllipsis !== false, true);
            line3 = `${tab}${ceBefore}${ceTarget}${ceAfter}`;
            line4 = `${tab}${' '.repeat(ceBefore.length)}^${'-'.repeat(ceTarget.length - 2)}|${' '.repeat(ceAfter.length)}`;
        }

        const trailingLines = ((hasOptions && options.excludeDetails === true) || message.details === undefined)
            ? []
            : message.details.map(d => `${tab}${tab}${d}`);

        return line1 + (!!line2 ? `\n${line2}` : '') + (!!line3 ? `\n${line3}` : '') + (!!line4 ? `\n${line4}` : '') + (trailingLines.length > 0 ? ('\n' + trailingLines.join('\n')) : '');
    }

    private static getContentExcerptForMessage(fileContent: string, contentCoordinates?: { startPosition: number, endPosition: number }): {
        before: string,
        target: string,
        after: string,
        includesEllipsis: boolean
    } {
        if (!!contentCoordinates && contentCoordinates.startPosition > -1 && contentCoordinates.endPosition > -1) {
            const before = ExtendedAsmMessageHelper.getTextBefore(fileContent, contentCoordinates.startPosition);
            const after = ExtendedAsmMessageHelper.getTextAfter(fileContent, contentCoordinates.endPosition);

            const targetEndPosition = Math.min(contentCoordinates.startPosition + ExtendedAsmMessageHelper._MAX_SEGMENT_LENGTH, contentCoordinates.endPosition);
            let target = fileContent.substring(contentCoordinates.startPosition, targetEndPosition);
            if (!after.endsWith(ExtendedAsmMessageHelper.ELLIPSIS) && targetEndPosition !== contentCoordinates.endPosition && !fileContent.substring(targetEndPosition).split('\n')[0].endsWith(target)) {
                target += ExtendedAsmMessageHelper.ELLIPSIS;
            }

            return {
                before: before,
                target: target.endsWith('\\') ? target.substring(0, target.length - 1) : target,
                after: after.endsWith('\\') ? after.substring(0, after.length - 1) : after,
                includesEllipsis: true
            }
        } else {
            return undefined;
        }
    }

    private static getContentCoordinates(contentCoordinates?: { startPosition: number, endPosition: number }): { startPosition: number, endPosition: number } | undefined {
        if (!!contentCoordinates && contentCoordinates.startPosition > -1 && contentCoordinates.endPosition > -1) {
            return contentCoordinates;
        } else {
            return undefined;
        }
    }

    private static getTextBefore(sourceString: string, startPosition: number): string {
        let before = '';
        let beforeContentStartIndex = 0;
        if (startPosition > 0) {
            const preceedingNewlineIndex = ExtendedAsmMessageHelper.findPreceedingNewlineIndex(sourceString, startPosition);
            before = sourceString.substring(preceedingNewlineIndex > -1 ? preceedingNewlineIndex : 0, startPosition);
            if (before.length > ExtendedAsmMessageHelper._MAX_SEGMENT_LENGTH) {
                before = `${ExtendedAsmMessageHelper.ELLIPSIS}${before.substring(before.length - ExtendedAsmMessageHelper._MAX_SEGMENT_LENGTH)}`;
                beforeContentStartIndex = 3;
            }

            const indexOfNewline = before.indexOf('\n');
            if (indexOfNewline > -1) {
                before = before.substring(0, indexOfNewline);
            }

            if (before.length - beforeContentStartIndex > ExtendedAsmMessageHelper._MAX_SEGMENT_LENGTH) {
                before = `${before.substring(0, ExtendedAsmMessageHelper._MAX_SEGMENT_LENGTH)}${ExtendedAsmMessageHelper.ELLIPSIS}`;
            }
        }

        if (!!before && before.endsWith('\\') && sourceString.charAt(startPosition + 2) === 'n') {
            before = before.substring(0, before.length - 2);
        }

        return before;
    }

    private static getTextAfter(sourceString: string, endPosition: number): string {
        let after = '';
        if (endPosition < sourceString.length) {
            after = sourceString.substring(endPosition);
            const indexOfNewline = after.indexOf('\n');
            if (indexOfNewline > -1) {
                after = after.substring(0, indexOfNewline);
            }

            if (after.length > ExtendedAsmMessageHelper._MAX_SEGMENT_LENGTH) {
                after = `${after.substring(0, ExtendedAsmMessageHelper._MAX_SEGMENT_LENGTH)}${ExtendedAsmMessageHelper.ELLIPSIS}`;
            }
        }

        return after;
    }
    
    private static computeStartLineIndex(fileContent: string, contentCoordinates?: { startPosition: number }): number {
        if (!!contentCoordinates) {
            return fileContent.substring(0, contentCoordinates.startPosition).split('\n').length - 1;
        } else {
            return undefined;
        }
    }

    private static findPreceedingNewlineIndex(text: string, startPosition: number): number {
        let index = -1;
        let currentPosition = startPosition;
        while (index === -1 && currentPosition > -1) {
            if (text.charAt(currentPosition) === '\n') {
                index = currentPosition;
            } else {
                currentPosition--;
            }
        }
        return index;
    }

    private static toPrintableContentExcerptSegment(text: string, includesEllipsis: boolean, ellipsisIsSuffix: boolean): string {
        const ellipsisRegex = RegExp((ellipsisIsSuffix ? '' : '^') + ExtendedAsmMessageHelper.ELLIPSIS_REGEX_SOURCE + (ellipsisIsSuffix ? '$' : ''), 'g');
        const textWithoutEllipsis = includesEllipsis
            ? text.replace(ellipsisRegex, '')
            : text;
        let printableSegment = '';
        let i = 0;
        while (i < textWithoutEllipsis.length) {
            const cc = textWithoutEllipsis.charCodeAt(i);
            const ch = textWithoutEllipsis.charAt(i);
            if (cc < 32) {
                if (ch === '\n') {
                    printableSegment += '\\n';
                } else if (ch === '\r') {
                    printableSegment += '\\r';
                } else if (ch === '\t') {
                    printableSegment += '\\t';
                } else if (ch === '\b') {
                    printableSegment += '\\b';
                } else {
                    printableSegment += `\\${cc}`;
                }
            } else {
                printableSegment += ch;
            }
            
            i++;
        }
        
        return printableSegment;
    }

    private static readonly _MAX_SEGMENT_LENGTH = 16;
}