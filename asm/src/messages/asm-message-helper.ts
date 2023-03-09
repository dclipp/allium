import { AsmMessageTemplate } from './asm-message-template';
import { AsmMessageClassification } from './asm-message-classification';
import { AsmMessage } from './asm-message';
import { localizeMessage } from './asm-message-strings';

export class AsmMessageHelper {
    public static generateMessage(template: AsmMessageTemplate, contentCoordinates?: { startPosition: number, endPosition: number }): AsmMessage {
        const messageCode = !!template.masterCode ? template.code + template.masterCode : template.code;
        return {
            code: messageCode,
            classification: template.classification,
            contentCoordinates: template.hasCoordinates ? contentCoordinates : undefined
        }
    }

    public static reclassifyMessage(message: AsmMessage, classification: AsmMessageClassification): AsmMessage {
        return {
            code: message.code,
            classification: classification,
            contentCoordinates: message.contentCoordinates
        }
    }

    public static stringifyClassification(classification: AsmMessageClassification): string {
        return AsmMessageHelper._CLASSIFICATION_STRINGS[classification.valueOf()];
    }

    public static localizeMessage(messageCode: number, locale: string): string {
        const localeElements = locale.split('_');
        return localizeMessage(messageCode, localeElements[0], localeElements[1]);
    }

    private static readonly _CLASSIFICATION_STRINGS = Object.keys(AsmMessageClassification).filter(k => Number.isNaN(Number.parseInt(k)));
}