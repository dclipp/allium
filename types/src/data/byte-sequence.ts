import { ByteSequenceLength } from './byte-sequence-length';

export interface ByteSequence<TLength extends ByteSequenceLength> {
    readonly OVERFLOW: boolean;
    readonly UNDERFLOW: boolean;
    readonly NaN: boolean;
    readonly LENGTH: TLength;
    readonly _implementationSpec?: number;

    isEqualTo(other: ByteSequence<1 | 2 | 3 | 4> | number): boolean;
    isLessThanOrEqualTo(other: ByteSequence<1 | 2 | 3 | 4> | number): boolean;
    isGreaterThanOrEqualTo(other: ByteSequence<1 | 2 | 3 | 4> | number): boolean;
    isLessThan(other: ByteSequence<1 | 2 | 3 | 4> | number): boolean;
    isGreaterThan(other: ByteSequence<1 | 2 | 3 | 4> | number): boolean;

    computeSum(other: ByteSequence<1 | 2 | 3 | 4> | number): ByteSequence<TLength>;
    computeDifference(other: ByteSequence<1 | 2 | 3 | 4> | number): ByteSequence<TLength>;
    computeProduct(other: ByteSequence<1 | 2 | 3 | 4> | number): ByteSequence<TLength>;
    computeQuotient(other: ByteSequence<1 | 2 | 3 | 4> | number): ByteSequence<TLength>;
    computeAnd(other: ByteSequence<1 | 2 | 3 | 4> | number): ByteSequence<TLength>;
    computeOr(other: ByteSequence<1 | 2 | 3 | 4> | number): ByteSequence<TLength>;
    computeXor(other: ByteSequence<1 | 2 | 3 | 4> | number): ByteSequence<TLength>;
    computeNot(): ByteSequence<TLength>;

    setByte(value: ByteSequence<1 | 2 | 3 | 4> | number, byteNumber: ByteSequenceLength): ByteSequence<TLength>;
    setBytes(value: ByteSequence<1 | 2 | 3 | 4> | number, startAt: ByteSequenceLength): ByteSequence<TLength>;
    getByte(byteNumber: ByteSequenceLength): ByteSequence<1>;
    getBytes(startByteNumber: ByteSequenceLength, count: ByteSequenceLength, projectedLength?: ByteSequenceLength): ByteSequence<1 | 2 | 3 | 4>;
    getMaskedBytes(mask: { readonly byte1: boolean, readonly byte2: boolean, readonly byte3: boolean, readonly byte4: boolean }): ByteSequence<1 | 2 | 3 | 4>;

    clone(): ByteSequence<TLength>;

    toString(format?: { radix?: number, padZeroes?: boolean }): string;
}
