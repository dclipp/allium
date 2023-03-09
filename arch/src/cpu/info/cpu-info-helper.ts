import { CpuInfo } from './cpu-info';
import { ByteSequenceLength, ByteSequence, ByteSequenceCreator, Byte, DoubleByte, QuadByte } from '@allium/types';
import { HumanReadableCpuInfo } from './human-readable-cpu-info';

function getBytesFromString(s: string, byteCount: ByteSequenceLength, maxOutIfTooLong: boolean): ByteSequence<1|2|3|4> {
    let byteValues = new Array<number>();
    let tooLong = false;
    for (let i = 0; i < s.length; i++) {
        byteValues.push(s.charCodeAt(i));
        if (s.length > byteCount) {
            tooLong = true;
        }
    }
    
    if (tooLong) {
        if (maxOutIfTooLong) {
            const maxValue = Math.pow(2, 8) - 1;
            byteValues = [];
            for (let i = 0; i < byteCount; i++) {
                byteValues.push(maxValue);
            }
        } else {
            throw new Error(`CpuInfoHelper: String (${s.length}) is too long to convert to ByteSequence<${byteCount}>`);
        }
    }

    if (byteCount === 1) {
        return ByteSequenceCreator.Byte(byteValues
            .map((v, i) => v << (i * 8))
            .reduce((x, y) => x + y, 0));
    } else if (byteCount === 2) {
        return ByteSequenceCreator.DoubleByte(byteValues
            .map((v, i) => v << (i * 8))
            .reduce((x, y) => x + y, 0));
    } else if (byteCount === 3) {
        return ByteSequenceCreator.TriByte(byteValues
            .map((v, i) => v << (i * 8))
            .reduce((x, y) => x + y, 0));
    } else { // byteCount === 4
        return ByteSequenceCreator.QuadByte(byteValues
            .map((v, i) => v << (i * 8))
            .reduce((x, y) => x + y, 0));
    }
}

function getFeatureMask(features: {
    readonly [key: string]: {
        readonly maskBitIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
        readonly maskNumber: 1 | 2;
        readonly isAvailable: boolean;
    }
}, maskNumber: 1 | 2): Byte {
    const keys = Object
        .keys(features)
        .filter(k => features[k].maskNumber === maskNumber);
    if (keys.length > 0) {
        return ByteSequenceCreator.Byte(keys
             .map(k => [features[k].maskBitIndex, features[k].isAvailable] as  [number, boolean])
             .sort((a, b) => a[0] - b[0])
             .map((x, i) => x[1] ? 1 << (i * 8) : 0 << (i * 8))
             .reduce((x, y) => x + y, 0));
    } else {
        return ByteSequenceCreator.Byte(0);
    }
}

const SPEED_1MHZ_IN_KHZ = 1000;

export const CpuInfoHelper: {
    toCpuInfo(o: CpuInfo | Partial<HumanReadableCpuInfo>): CpuInfo
} = {
    toCpuInfo: (o: CpuInfo | Partial<HumanReadableCpuInfo>) => {
        let cpuInfo: CpuInfo = null;
        if (!!o && Object.getOwnPropertyNames(o).includes('CLOCK_SPEED')) { // CpuInfo
            cpuInfo = o as CpuInfo;
        } else { // Partial<HumanReadableCpuInfo>
            const hrInfo = !!o ? o as Partial<HumanReadableCpuInfo> : {};
            cpuInfo = {
                CLOCK_SPEED: hrInfo.clockSpeedKhz === undefined
                    ? ByteSequenceCreator.QuadByte(SPEED_1MHZ_IN_KHZ)
                    : ByteSequenceCreator.QuadByte(hrInfo.clockSpeedKhz),
                MODEL_IDENTIFIER: !!hrInfo.modelId
                    ? getBytesFromString(hrInfo.modelId, 2, false) as DoubleByte
                    : ByteSequenceCreator.DoubleByte(0),
                FEATURE_MASK_1: !!hrInfo.features
                    ? getFeatureMask(hrInfo.features, 1)
                    : ByteSequenceCreator.Byte(0),
                FEATURE_MASK_2: !!hrInfo.features
                    ? getFeatureMask(hrInfo.features, 2)
                    : ByteSequenceCreator.Byte(0),
                SERIAL_NUMBER: !!hrInfo.serialNumber
                    ? getBytesFromString(hrInfo.serialNumber, 4, true) as QuadByte
                    : ByteSequenceCreator.QuadByte(0)
            }
        }

        if (cpuInfo.CLOCK_SPEED.isLessThan(SPEED_1MHZ_IN_KHZ)) {
            throw new Error(`CpuInfoHelper: CPU speed cannot be lower than ${SPEED_1MHZ_IN_KHZ} KHz`);
        } else {
            return cpuInfo;
        }
    }
}