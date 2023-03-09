import { NamedRegisterMask, namedRegisterMaskMap } from './named-register-mask';
import { ByteSequenceLength } from '../data/byte-sequence-length';

export interface RegisterMask {
    readonly byte1: boolean;
    readonly byte2: boolean;
    readonly byte3: boolean;
    readonly byte4: boolean;
    readonly name: NamedRegisterMask;
    readonly sequenceLength: ByteSequenceLength;
}

function getMaskName(mask: {
    readonly [byte: string]: boolean
}): NamedRegisterMask {
    const maskValue = Number.parseInt(Object
        .keys(mask)
        .map((k, ki) => mask[k] === true ? '1' : '0')
        .reduce((x, y) => x + y, ''), 2);
    
    if (namedRegisterMaskMap.has(maskValue)) {
        return namedRegisterMaskMap.get(maskValue);
    } else {
        return NamedRegisterMask.Unnamed;
    }
}

function createMask(mask: {
    readonly byte1: boolean,
    readonly byte2: boolean,
    readonly byte3: boolean,
    readonly byte4: boolean,
    readonly [byte: string]: boolean
}): RegisterMask {
    const sequenceLength = Object.keys(mask).filter(k => mask[k] === true).length;
    if (sequenceLength < 1) {
        throw new Error('Invalid mask: At least 1 byte must be set');
    } else {
        return {
            byte1: mask.byte1,
            byte2: mask.byte2,
            byte3: mask.byte3,
            byte4: mask.byte4,
            name: getMaskName(mask),
            sequenceLength: sequenceLength as ByteSequenceLength
        }
    }
}

export function RegisterMask(mask: {
    readonly byte1: boolean,
    readonly byte2: boolean,
    readonly byte3: boolean,
    readonly byte4: boolean
} | NamedRegisterMask.Full
    | NamedRegisterMask.High
    | NamedRegisterMask.Low
    | NamedRegisterMask.HighLow
    | NamedRegisterMask.LowHigh
    | NamedRegisterMask.HighHigh
    | NamedRegisterMask.LowLow
    | NamedRegisterMask.ExtendedHigh
    | NamedRegisterMask.ExtendedLow): RegisterMask {

    if (Object.getOwnPropertyNames(mask).includes('byte1')) {
        return createMask(mask as {
            readonly byte1: boolean,
            readonly byte2: boolean,
            readonly byte3: boolean,
            readonly byte4: boolean
        });
    } else {
        const nrm = mask as NamedRegisterMask;
        let byte1 = false;
        let byte2 = false;
        let byte3 = false;
        let byte4 = false;

        if (nrm === NamedRegisterMask.Full) {
            byte1 = true;
            byte2 = true;
            byte3 = true;
            byte4 = true;
        } else if (nrm === NamedRegisterMask.High) {
            byte1 = true;
            byte2 = true;
        } else if (nrm === NamedRegisterMask.Low) {
            byte3 = true;
            byte4 = true;
        } else if (nrm === NamedRegisterMask.HighLow) {
            byte2 = true;
        } else if (nrm === NamedRegisterMask.LowHigh) {
            byte3 = true;
        } else if (nrm === NamedRegisterMask.HighHigh) {
            byte1 = true;
        } else if (nrm === NamedRegisterMask.LowLow) {
            byte4 = true;
        } else if (nrm === NamedRegisterMask.ExtendedHigh) {
            byte1 = true;
            byte2 = true;
            byte3 = true;
        } else if (nrm === NamedRegisterMask.ExtendedLow) {
            byte2 = true;
            byte3 = true;
            byte4 = true;
        }

        return createMask({
            byte1: byte1,
            byte2: byte2,
            byte3: byte3,
            byte4: byte4
        });
    }
}