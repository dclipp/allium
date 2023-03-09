import { DoubleByte, Byte, QuadByte } from '@allium/types';

export interface CpuInfo {
    readonly CLOCK_SPEED: QuadByte;
    readonly MODEL_IDENTIFIER: DoubleByte;
    readonly FEATURE_MASK_1: Byte;
    readonly FEATURE_MASK_2: Byte;
    readonly SERIAL_NUMBER: QuadByte;
}
