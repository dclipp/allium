import { Byte } from './byte';
import { TriByte } from './tri-byte';
import { DoubleByte } from './double-byte';
import { QuadByte } from './quad-byte';
import { DynamicByteSequence } from './dynamic-byte-sequence';
import { ByteSequenceInstance } from './byte-sequence-instance';

function isNumberArray(o: any): o is Array<number> {
    return !!o && o.length !== undefined;
}

export const ByteSequenceCreator: {
    Byte: (value: number) => Byte,
    DoubleByte: (value: number | Array<number>) => DoubleByte,
    TriByte: (value: number | Array<number>) => TriByte,
    QuadByte: (value: number | Array<number>) => QuadByte,
    Unbox: (sequence: DynamicByteSequence) => number
} = {
    Byte: (value: number) => new ByteSequenceInstance(value, false, false, false, 1),
    DoubleByte: (value: number | Array<number>) => {
        let nv: number;
        if (isNumberArray(value)) {
            if (value.length > 2) {
                throw new Error('ByteSequenceCreator: DoubleByte: Too many numeric elements provided');
            } else {
                nv = value.map((v, i) => v << (i * 8)).reduce((x, y) => x + y, 0);
            }
        } else {
            nv = value;
        }
        return new ByteSequenceInstance(nv, false, false, false, 2);
    },
    TriByte: (value: number | Array<number>) => {
        let nv: number;
        if (isNumberArray(value)) {
            if (value.length > 3) {
                throw new Error('ByteSequenceCreator: TriByte: Too many numeric elements provided');
            } else {
                nv = value.map((v, i) => v << (i * 8)).reduce((x, y) => x + y, 0);
            }
        } else {
            nv = value;
        }
        return new ByteSequenceInstance(nv, false, false, false, 3);
    },
    QuadByte: (value: number | Array<number>) => {
        let nv: number;
        if (isNumberArray(value)) {
            if (value.length > 4) {
                throw new Error('ByteSequenceCreator: QuadByte: Too many numeric elements provided');
            } else {
                nv = value.map((v, i) => v << (i * 8)).reduce((x, y) => x + y, 0);
            }
        } else {
            nv = value;
        }
        return new ByteSequenceInstance(nv, false, false, false, 4);
    },
    Unbox: (sequence: DynamicByteSequence) => {
        if (sequence._implementationSpec === 100) {
            return (sequence as any)._numericValue;
        } else {
            return Number.parseInt(sequence.toString({ radix: 10, padZeroes: false }));
        }
    }
}