import { TriByte, QuadByte } from '@allium/types';

export interface S4AutoAddressRef {
    readonly tokenIndices: Array<number>;
    readonly resolvedAddress: TriByte | QuadByte | 'deferred' | 'error';
}