export interface HumanReadableCpuInfo {
    readonly serialNumber: string;
    readonly modelId: string;
    readonly clockSpeedKhz: number;
    readonly features: {
        readonly [key: string]: {
            readonly maskBitIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
            readonly maskNumber: 1 | 2;
            readonly isAvailable: boolean;
        }
    };
}