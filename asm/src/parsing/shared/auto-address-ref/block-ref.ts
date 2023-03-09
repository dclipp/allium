export interface BlockRef {
    readonly blockName: string;
    readonly externalObjectName: string | null;
    readonly isExternalBlock: boolean;
    readonly isEmbedded: boolean;
}