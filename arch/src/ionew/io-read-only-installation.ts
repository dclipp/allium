import { IoInstallation } from './io-installation';
import { Byte } from '@allium/types';

export interface IoReadOnlyInstallation extends IoInstallation {
    readonly channel: Byte;
    readonly preferredBufferLength: number;
}