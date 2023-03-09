import { AsmMessageClassification } from './asm-message-classification';

export interface AsmMessage {
    readonly code: number;
    readonly classification: AsmMessageClassification;
    readonly contentCoordinates?: { readonly startPosition: number, readonly endPosition: number };
}