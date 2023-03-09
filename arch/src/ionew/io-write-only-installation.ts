import { IoInstallation } from './io-installation';
import { Byte } from '@allium/types';

export interface IoWriteOnlyInstallation extends IoInstallation {
    readonly channel: Byte;
    readonly preferredBufferLength: number;
}