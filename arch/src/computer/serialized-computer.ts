import { FlagName, Register } from '@allium/types';
import { ClockType } from '../clock/clock-type';
import { SerializedIoInstallation } from '../ionew/serialized-io-installation';

export interface SerializedComputer {
    readonly registers: Array<{
        readonly register: Register;
        readonly value: number;
    }>;

    readonly memory: Array<{
        readonly address: number;
        readonly value: number;
    }>;

    readonly memorySize: number;

    readonly raisedFlags: Array<FlagName>;

    readonly isDebuggable: boolean;

    readonly program: Array<number>;

    readonly io: Array<SerializedIoInstallation>;

    readonly cpuInfo: {
        readonly CLOCK_SPEED: number;
        readonly MODEL_IDENTIFIER: number;
        readonly FEATURE_MASK_1: number;
        readonly FEATURE_MASK_2: number;
        readonly SERIAL_NUMBER: number;
    };

    readonly clock: {
        readonly value: number;
        readonly type: ClockType;
    };

    readonly isIdle: boolean;
}