import { ByteSequenceLength } from './byte-sequence-length';
import { ByteSequence } from './byte-sequence';

export class ByteSequenceInstance<TLength extends ByteSequenceLength> implements ByteSequence<TLength> {
    public readonly OVERFLOW: boolean;
    public readonly UNDERFLOW: boolean;
    public readonly NaN: boolean;
    public readonly LENGTH: TLength;
    public readonly _implementationSpec: number;

    isEqualTo(other: number | ByteSequence<ByteSequenceLength>): boolean {
        return ByteSequenceInstance.toNumericValue(other) === this._numericValue;
    }

    isLessThanOrEqualTo(other: number | ByteSequence<ByteSequenceLength>): boolean {
        return this._numericValue <= ByteSequenceInstance.toNumericValue(other);
    }

    isGreaterThanOrEqualTo(other: number | ByteSequence<ByteSequenceLength>): boolean {
        return this._numericValue >= ByteSequenceInstance.toNumericValue(other);
    }

    isLessThan(other: number | ByteSequence<ByteSequenceLength>): boolean {
        return this._numericValue < ByteSequenceInstance.toNumericValue(other);
    }

    isGreaterThan(other: number | ByteSequence<ByteSequenceLength>): boolean {
        return this._numericValue > ByteSequenceInstance.toNumericValue(other);
    }

    computeSum(other: number | ByteSequence<ByteSequenceLength>): ByteSequence<TLength> {
        const n = ByteSequenceInstance.toNumericValue(other);
        const sum = n + this._numericValue;
        if (sum < this._numericValue || sum > this._max) { // Overflow
            const overflowedByAmount = sum < this._numericValue
                ? n - this._numericValue
                : sum - this._max;
            return new ByteSequenceInstance<TLength>(
                overflowedByAmount, true, this.UNDERFLOW, this.NaN, this.LENGTH);
        } else {
            return new ByteSequenceInstance<TLength>(
                sum, this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
        }
    }

    computeDifference(other: number | ByteSequence<ByteSequenceLength>): ByteSequence<TLength> {
        const n = ByteSequenceInstance.toNumericValue(other);
        const diff = this._numericValue - n;
        if (diff > this._numericValue || diff < 0) { // Underflow
            const underflowedByAmount = diff > this._numericValue
                ? n - this._numericValue
                : Math.abs(diff);
            return new ByteSequenceInstance<TLength>(
                underflowedByAmount, this.OVERFLOW, true, this.NaN, this.LENGTH);
        } else {
            return new ByteSequenceInstance<TLength>(
                diff, this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
        }
    }

    computeProduct(other: number | ByteSequence<ByteSequenceLength>): ByteSequence<TLength> {
        const n = ByteSequenceInstance.toNumericValue(other);
        const product = n * this._numericValue;
        if (product > this._max) { // Overflow
            const overflowedByAmount = product < this._numericValue
                ? n - this._numericValue
                : product - this._max;
            return new ByteSequenceInstance<TLength>(
                overflowedByAmount, true, this.UNDERFLOW, this.NaN, this.LENGTH);
        } else {
            return new ByteSequenceInstance<TLength>(
                product, this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
        }
    }

    computeQuotient(other: number | ByteSequence<ByteSequenceLength>): ByteSequence<TLength> {
        const n = ByteSequenceInstance.toNumericValue(other);
        if (n === 0) { // NaN
            return new ByteSequenceInstance<TLength>(
                Number.NaN, this.OVERFLOW, this.UNDERFLOW, true, this.LENGTH);
        } else {
            return new ByteSequenceInstance<TLength>(
                Math.floor(this._numericValue / n), this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
        }
    }

    computeAnd(other: number | ByteSequence<ByteSequenceLength>): ByteSequence<TLength> {
        if (ByteSequenceInstance.isValid(this)) {
            if (ByteSequenceInstance.isByteSequenceInstance(other)) {
                if (ByteSequenceInstance.isValid(other)) {
                    return new ByteSequenceInstance(
                        this._numericValue & ByteSequenceInstance.toNumericValue(other), this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
                } else {
                    return new ByteSequenceInstance(
                        Number.NaN, false, false, true, this.LENGTH);
                }
            } else {
                return new ByteSequenceInstance(
                    this._numericValue & other, this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
            }
        } else {
            return new ByteSequenceInstance(
                Number.NaN, false, false, true, this.LENGTH);
        }
    }

    computeOr(other: number | ByteSequence<ByteSequenceLength>): ByteSequence<TLength> {
        if (ByteSequenceInstance.isValid(this)) {
            const n = ByteSequenceInstance.toNumericValue(other) & (Math.pow(2, 8 * this.LENGTH) - 1);
            if (!ByteSequenceInstance.isByteSequenceInstance(other) || ByteSequenceInstance.isValid(other)) {
                return new ByteSequenceInstance(
                    this._numericValue | n, this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
            } else {
                return new ByteSequenceInstance(
                    Number.NaN, false, false, true, this.LENGTH);
            }
        } else {
            return new ByteSequenceInstance(
                Number.NaN, false, false, true, this.LENGTH);
        }
    }

    computeXor(other: number | ByteSequence<ByteSequenceLength>): ByteSequence<TLength> {
        if (ByteSequenceInstance.isValid(this)) {
            const n = ByteSequenceInstance.toNumericValue(other) & (Math.pow(2, 8 * this.LENGTH) - 1);
            if (!ByteSequenceInstance.isByteSequenceInstance(other) || ByteSequenceInstance.isValid(other)) {
                let initialBitString = this._numericValue.toString(2);
                while (initialBitString.length < this.LENGTH * 8) {
                    initialBitString = `0${initialBitString}`;
                }
                let otherBitString = n.toString(2);
                while (otherBitString.length < this.LENGTH * 8) {
                    otherBitString = `0${otherBitString}`;
                }
                let bitString = '';
                
                for (let i = 0; i < this.LENGTH * 8; i++) {
                    if (initialBitString.charAt(i) === otherBitString.charAt(i)) {
                        bitString += '0';
                    } else {
                        bitString += '1';
                    }
                }

                return new ByteSequenceInstance(
                    Number.parseInt(bitString, 2), this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
            } else {
                return new ByteSequenceInstance(
                    Number.NaN, false, false, true, this.LENGTH);
            }
        } else {
            return new ByteSequenceInstance(
                Number.NaN, false, false, true, this.LENGTH);
        }
    }

    computeNot(): ByteSequence<TLength> {
        if (ByteSequenceInstance.isValid(this)) {
            const initialBitString = this._numericValue.toString(2);
            const bitCount = 8 * this.LENGTH;
            let bitString = '';
            let index = 0;
            while (bitString.length < bitCount) {
                if (index < initialBitString.length) {
                    const currentBit = initialBitString.charAt(index) === '1' ? '0' : '1';
                    bitString = `${bitString}${currentBit}`;
                    index++;
                } else {
                    bitString = `1${bitString}`;
                }
            }

            return new ByteSequenceInstance(
                Number.parseInt(bitString, 2), this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
        } else {
            return new ByteSequenceInstance(
                Number.NaN, false, false, true, this.LENGTH);
        }
    }

    setByte(value: number | ByteSequence<ByteSequenceLength>, byteNumber: ByteSequenceLength): ByteSequence<TLength> {
        if (byteNumber > this.LENGTH) {
            throw new Error('ByteSequence: setByte: byteNumber cannot exceed the length of the sequence');
        } else {
            const other = new ByteSequenceInstance(
                ByteSequenceInstance.toNumericValue(value), false, false, false, 4);
            const n = ByteSequenceInstance.toNumericValue(other.getByte(1));
            let updatedValue = this._numericValue;

            if (byteNumber === 1) {
                updatedValue = n + (this._numericValue & 0xFFFFFF00);
            } else if (byteNumber === 2) {
                updatedValue = (n << 8) + (this._numericValue & 0xFFFF00FF);
            } else if (byteNumber === 3) {
                updatedValue = (n << 16) + (this._numericValue & 0xFF00FFFF);
            } else if (byteNumber === 4) {
                updatedValue = (n << 24) + (this._numericValue & 0x00FFFFFF);
            }

            return new ByteSequenceInstance(
                updatedValue, this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
        }
    }

    setBytes(value: number | ByteSequence<ByteSequenceLength>, startAt: ByteSequenceLength): ByteSequence<TLength> {
        const bytes = [
            this._numericValue & 255,
            (this._numericValue >> 8) & 255,
            (this._numericValue >> 16) & 255,
            (this._numericValue >> 24) & 255
        ]
        if (ByteSequenceInstance.isByteSequenceInstance(value)) {
            let valueByteNumber = 1;
            for (let i = startAt; i <= value.LENGTH; i++) {
                bytes[i - 1] = ByteSequenceInstance.toNumericValue(
                    value.getByte(valueByteNumber as ByteSequenceLength));
                valueByteNumber++;
            }
            
            const updatedValue = bytes
                .map((b, i) => b << (8 * i))
                .reduce((x, y) => x + y, 0);
            return new ByteSequenceInstance(
                updatedValue, this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
        } else {
            return this.setBytes(
                new ByteSequenceInstance(value, false, false, false, 4),
                startAt
            );
        }
    }

    getByte(byteNumber: ByteSequenceLength): ByteSequence<1> {
        if (byteNumber > this.LENGTH) {
            throw new Error('ByteSequence: getByte: byteNumber cannot exceed the length of the sequence');
        } else if (ByteSequenceInstance.isValid(this)) {
            return new ByteSequenceInstance(
                byteNumber === 1
                    ? this._numericValue & 255
                    : byteNumber === 2
                    ? (this._numericValue >> 8) & 255
                    : byteNumber === 3
                    ? (this._numericValue >> 16) & 255
                    : (this._numericValue >> 24) & 255,
                false,
                false,
                false,
                1);
        } else {
            return new ByteSequenceInstance<1>(Number.NaN, false, false, true, 1);
        }
    }

    getBytes(startByteNumber: ByteSequenceLength, count: ByteSequenceLength, projectedLength?: ByteSequenceLength): ByteSequence<ByteSequenceLength> {
        if (startByteNumber > this.LENGTH) {
            throw new Error('ByteSequence: getBytes: byteNumber cannot exceed the length of the sequence');
        } else if (startByteNumber + count > this.LENGTH) {
            throw new Error('ByteSequence: getBytes: byteNumber + count cannot exceed the length of the sequence');
        } else {
            let subsegmentValue = 0;
            
            for (let i = startByteNumber; i <= startByteNumber + count; i++) {
                const currentSegment = this.getByte(i);
                subsegmentValue += (ByteSequenceInstance.toNumericValue(currentSegment) << (8 * i));
            }

            if (projectedLength === undefined) {
                const requiredByteCount = subsegmentValue <= ByteSequenceInstance._MAX_1_BYTE
                    ? 1
                    : subsegmentValue <= ByteSequenceInstance._MAX_2_BYTES
                    ? 2
                    : subsegmentValue <= ByteSequenceInstance._MAX_3_BYTES
                    ? 3
                    : 4;
                return new ByteSequenceInstance(
                    subsegmentValue, false, false, false, requiredByteCount);
            } else if (projectedLength === 4) {
                return new ByteSequenceInstance(
                    subsegmentValue, false, false, false, 4);
            } else if (projectedLength === 3 && subsegmentValue <= ByteSequenceInstance._MAX_3_BYTES) {
                return new ByteSequenceInstance(
                    subsegmentValue, false, false, false, 3);
            } else if (projectedLength === 2 && subsegmentValue <= ByteSequenceInstance._MAX_2_BYTES) {
                return new ByteSequenceInstance(
                    subsegmentValue, false, false, false, 2);
            } else if (projectedLength === 1 && subsegmentValue <= ByteSequenceInstance._MAX_1_BYTE) {
                return new ByteSequenceInstance(
                    subsegmentValue, false, false, false, 1);
            } else {
                throw new Error('ByteSequence: getBytes: The subsegment cannot fit within the provided projectedLength');
            }
        }
    }

    getMaskedBytes(mask: { readonly byte1: boolean, readonly byte2: boolean, readonly byte3: boolean, readonly byte4: boolean }): ByteSequence<ByteSequenceLength> {
        const bytes = new Array<number>();

        if (mask.byte1) {
            bytes.push(this._numericValue & 255);
        }
        if (mask.byte2) {
            bytes.push((this._numericValue >> 8) & 255);
        }
        if (mask.byte3) {
            bytes.push((this._numericValue >> 16) & 255);
        }
        if (mask.byte4) {
            bytes.push((this._numericValue >> 24) & 255);
        }

        if (bytes.length > this.LENGTH) {
            throw new Error('ByteSequence: getMaskedBytes: Mask is larger than the sequence');
        } else {
            const subsegmentValue = bytes.map((b, bi) => (b << (8 * bi))).reduce((x, y) => x + y, 0);
            return new ByteSequenceInstance(
                subsegmentValue, false, false, false, bytes.length as ByteSequenceLength);
        }
    }

    clone(): ByteSequence<TLength> {
        return new ByteSequenceInstance(
            this._numericValue, this.OVERFLOW, this.UNDERFLOW, this.NaN, this.LENGTH);
    }

    toString(format?: { radix?: number; padZeroes?: boolean; }): string {
        const radixOption = !!format ? format.radix || 10 : 10;
        const padZeroesOption = !!format ? format.padZeroes === true : true;
        let stringValue = Number.isInteger(this._numericValue)
            ? this._numericValue.toString(radixOption)
            : '?';
        let padCharacter = Number.isInteger(this._numericValue) ? '0' : '?';
        if (padZeroesOption) {
            const maxValue = Math.pow(2, this.LENGTH * 8) - 1;
            const requiredLength = Math.ceil(Math.log(maxValue) / Math.log(radixOption));
            while (stringValue.length < requiredLength) {
                stringValue = padCharacter + stringValue;
            }
            return stringValue;
        } else {
            return stringValue;
        }
    }

    public constructor(valuex: number, overflow: boolean, underflow: boolean, notANumber: boolean, length: TLength) {
        const _value = Number.isInteger(valuex) ? Uint32Array.of(valuex)[0] : Number.NaN;
        if (Number.isNaN(_value) && !notANumber) {
            notANumber = true;
        }
            this.OVERFLOW = overflow;
            this.UNDERFLOW = underflow;
            this.NaN = notANumber;
            this.LENGTH = length;
            this._implementationSpec = 100;

        if (Number.isInteger(_value)) {
            if (_value < 0) {
                this._numericValue = Math.abs(_value) + ((Math.abs(_value << 1)) & 0xFFFFFFFE);
            } else {
                this._numericValue = _value;
            }
        } else if (notANumber) {
            this._numericValue = Number.NaN;
        } else {
            throw new Error('ByteSequence: Numeric value must be an integer');
        }
        this._max = Math.pow(2, length * 8) - 1;
        /*
        if (Number.isInteger(value)) {
            this.OVERFLOW = overflow;
            this.UNDERFLOW = underflow;
            this.NaN = notANumber;
            this.LENGTH = length;
            this._implementationSpec = 100;
            if (value < 0) {
                ByteSequenceInstance.numericValueAsNumber(this._numericValue3) = Math.abs(value) + ((Math.abs(value << 1)) & 0xFFFFFFFE);
            } else {
                ByteSequenceInstance.numericValueAsNumber(this._numericValue3) = value;
            }
            this._max = Math.pow(2, length * 8) - 1;
        } else {
            throw new Error('ByteSequence: Numeric value must be an integer');
        }*/
    }

    private readonly _numericValue: number;
    private readonly _max: number;
    private static readonly _MAX_3_BYTES = Math.pow(2, 24) - 1;
    private static readonly _MAX_2_BYTES = Math.pow(2, 16) - 1;
    private static readonly _MAX_1_BYTE = Math.pow(2, 8) - 1;

    private static toNumericValue(other: number | ByteSequence<ByteSequenceLength>): number {
        if (ByteSequenceInstance.isByteSequenceInstance(other)) {
            return Number.parseInt(other.toString({ radix: 10 }));
        } else {
            return other;
        }
    }

    private static isValid(sequence: ByteSequence<ByteSequenceLength>): boolean {
        return !(sequence.OVERFLOW || sequence.UNDERFLOW || sequence.NaN);
    }

    public static isByteSequenceInstance(o: any): o is ByteSequence<ByteSequenceLength> {
        return Object.getOwnPropertyNames(o).includes('LENGTH');
    }
}