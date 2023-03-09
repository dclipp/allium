import { AutoAddressRefKind } from './auto-address-ref-kind';
import { BlockRef } from './block-ref';
import { RelativeRef } from './relative-ref';

export type AutoAddressRef = ({
    readonly kind: AutoAddressRefKind.Block;
} & BlockRef) | ({
    readonly kind: AutoAddressRefKind.Relative;
} & RelativeRef) | ({
    readonly kind: AutoAddressRefKind.Invalid;
} & { readonly literal: string });