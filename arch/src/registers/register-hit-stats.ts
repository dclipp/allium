import { Register } from '@allium/types';

export interface RegisterHitsByMask {
    readonly full: number;
    readonly hh: number;
    readonly hl: number;
    readonly lh: number;
    readonly ll: number;
    readonly COUNT: number;
}

export interface RegisterHitStatsElement {
    readonly register: Register;
    readonly reads: RegisterHitsByMask;
    readonly writes: RegisterHitsByMask;
}

export type RegisterHitStats = Array<RegisterHitStatsElement>