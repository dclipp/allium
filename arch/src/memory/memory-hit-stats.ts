import { QuadByte } from '@allium/types';

export interface MemoryHitStats {
    readonly reads: Array<QuadByte>;
    readonly writes: Array<QuadByte>;
}