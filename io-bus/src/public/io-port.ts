import { Byte, DeviceProfile } from '@allium/types';

export interface IoPort {
    getClientBufferSize(): number;
    getClientReadableLength(): number;
    getClientWritableLength(): number;
    readAsClient(): Byte;
    writeAsClient(b: Byte): boolean;
    flushAsClient(): void;
    clearAsClient(): void;
    writeToLog(message: string): void;

    getHostBufferSize(): number;
    getHostReadableLength(): number;
    getHostWritableLength(): number;
    readAsHost(): Byte;
    writeAsHost(b: Byte): boolean;
    flushAsHost(): void;
    clearAsHost(): void;

    getProfile(): DeviceProfile;
}
