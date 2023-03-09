import { QuadByte } from './quad-byte';
import { ByteSequenceCreator } from './byte-sequence-creator';

const PRECISION = 6;
const FRACTION_BIT_WIDTH = 14;
const WHOLE_BIT_WIDTH = 17;
const SET1 = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const SET2 = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const SET3 = ['0', '3', '5', '7', '9'];
const SET4 = ['0', '2', '4', '8'];
const SET5 = ['0', '5', '9'];
const SET6 = ['0', '5', '9'];

function iterateSet(digitSets: Array<Array<string>>, setIndex: number): Array<string> {
    const supportedDigits = new Array<string>();

    if (setIndex === digitSets.length - 1) {
        digitSets[setIndex].forEach(sd => {
            supportedDigits.push(`${sd}`);
        })
    } else {
        digitSets[setIndex].forEach(s => {
            iterateSet(digitSets, setIndex + 1).forEach(sd => {
                supportedDigits.push(`${s}${sd}`);
            })
        })
    }

    return supportedDigits;
}

function realNumberConverter(): {
    fromJsNumber(value: number): QuadByte,
    toJsNumber(value: QuadByte): number
} {
    const SUPPORTED = iterateSet([SET1, SET2, SET3, SET4, SET5, SET6], 0).filter(d => d === '000000' || d === '999899' ?
    true
    : (Number.parseInt(d) % 11 !== 0));
    const SUPPORTED_NUMERICS = SUPPORTED.map(d => Number.parseInt(d));

    function correctDigits(digits: string): string {
        if (SUPPORTED.includes(digits)) {
            return digits;
        } else {
            const v = Number.parseInt(digits);
            return SUPPORTED[SUPPORTED_NUMERICS.map((n, ni) => {
                return {
                    distance: Math.abs(n - v),
                    index: ni
                }
            }).sort((a, b) => a.distance - b.distance)[0].index];
        }
    }

    function findIndex(digits: string): number {
        const n = Number.parseInt(digits);
        let useDigits = digits;
        if (n !== 0 && n !== 999899 && n % 11 === 0) {
            useDigits = (n - 1).toString().padEnd(PRECISION, '0');
        }

        useDigits = correctDigits(useDigits);
        return SUPPORTED.indexOf(useDigits);
    }

    function getBits(width: number, value: number): string {
        let bits = '';
        for (let i = 0; i < width; i++) {
            const b = ((value >> i) & 1) === 0 ? '0' : '1';
            bits += b;
        }
        return bits;
    }

    function flipEndianness(bits: string): string {
        let flipped = '';
        for (let i = bits.length - 1; i > -1; i--) {
            flipped += bits.charAt(i);
        }
        return flipped;
    }

    function encodeWhole(wholeValue: number): string {
        // 131,072
        if (wholeValue > 131071) {
            throw new Error('Whole value is too large');
        } else if (wholeValue < -131072) {
            throw new Error('Whole value is too small');
        } else {
            let value = wholeValue < 0 ? Math.abs(wholeValue) - 1 : wholeValue;
            const signBit = wholeValue < 0 ? '1' : '0';
            return signBit + getBits(WHOLE_BIT_WIDTH, value);
        }
    }

    function fromJsNumber(value: number): QuadByte {
        const s = value.toFixed(PRECISION).split('.');
        
        const wholeValue = Number.parseInt(s[0]);
        const wholeBits = encodeWhole(wholeValue);

        const fractionIndex = findIndex(s[1]);
        const fractionBits = getBits(FRACTION_BIT_WIDTH, fractionIndex);

        const jsValue = Number.parseInt(flipEndianness(`${fractionBits}${wholeBits}`), 2);
        return ByteSequenceCreator.QuadByte(jsValue);
    }

    function toJsNumber(value: QuadByte): number {
        const bits = value.toString({ radix: 2, padZeroes: true });

        const fractionIndex = Number.parseInt(bits.substring(WHOLE_BIT_WIDTH + 1), 2);
        const fractionDigits = SUPPORTED[fractionIndex];

        let wholeValue = Number.parseInt(bits.substring(0, WHOLE_BIT_WIDTH), 2);
        const isNegative = bits.charAt(WHOLE_BIT_WIDTH) === '1';
        if (isNegative) {
            wholeValue++;
        }

        return Number.parseFloat(`${isNegative ? '-' : ''}${wholeValue}.${fractionDigits}`);
    }

    return {
        fromJsNumber: (value) => fromJsNumber(value),
        toJsNumber: (value) => toJsNumber(value)
    }
}

function checkOverUnderFlow(fromJsNumber: (value: number) => QuadByte, value: number): QuadByte {
    if (value > 131071) {
        return fromJsNumber(value - 131071);
    } else if (value < -131072) {
        return fromJsNumber(value + 131072);
    } else {
        return fromJsNumber(value);
    }
}

export const RealNumber: {
    encode: (value: number) => QuadByte;
    decode: (value: QuadByte) => number;
    computeSum: (a: QuadByte, b: QuadByte) => QuadByte;
    computeDifference: (a: QuadByte, b: QuadByte) => QuadByte;
    computeProduct: (a: QuadByte, b: QuadByte) => QuadByte;
    computeQuotient: (a: QuadByte, b: QuadByte) => QuadByte;
    floor: (value: QuadByte) => QuadByte;
    ceil: (value: QuadByte) => QuadByte;
    round: (value: QuadByte) => QuadByte;
} = {
    encode: (value) => {
        return realNumberConverter().fromJsNumber(value);
    },
    decode: (value) => {
        return realNumberConverter().toJsNumber(value);
    },
    computeSum: (a, b) => {
        const rnc = realNumberConverter();
        return checkOverUnderFlow(rnc.fromJsNumber, rnc.toJsNumber(a) + rnc.toJsNumber(b));
    },
    computeDifference: (a, b) => {
        const rnc = realNumberConverter();
        return checkOverUnderFlow(rnc.fromJsNumber, rnc.toJsNumber(a) + rnc.toJsNumber(b));
    },
    computeProduct: (a, b) => {
        const rnc = realNumberConverter();
        return checkOverUnderFlow(rnc.fromJsNumber, rnc.toJsNumber(a) + rnc.toJsNumber(b));
    },
    computeQuotient: (a, b) => {
        const rnc = realNumberConverter();
        return checkOverUnderFlow(rnc.fromJsNumber, rnc.toJsNumber(a) + rnc.toJsNumber(b));
    },
    floor: (value) => {
        const rnc = realNumberConverter();
        return rnc.fromJsNumber(Math.floor(rnc.toJsNumber(value)));
    },
    ceil: (value) => {
        const rnc = realNumberConverter();
        return rnc.fromJsNumber(Math.ceil(rnc.toJsNumber(value)));
    },
    round: (value) => {
        const rnc = realNumberConverter();
        return rnc.fromJsNumber(Math.round(rnc.toJsNumber(value)));
    }
}