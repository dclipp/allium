import { QuadByte, Byte } from '@allium/types';

export interface MemoryModule {
    readonly SIZE: QuadByte;
    read(address: QuadByte): Byte;
    write(address: QuadByte, value: Byte): void;
    wipe(): void;
}
