import { AsmMessageClassification } from './asm-message-classification';

export type AsmMessageTemplate = {
    readonly hasCoordinates: boolean;
    readonly code: number;
    readonly classification: AsmMessageClassification;
    readonly masterCode?: number;
}