import { IoInstallation } from './io-installation';
import { Byte } from '@allium/types';

export interface IoBidirectionalInstallation extends IoInstallation {
    readonly inputChannel: Byte;
    readonly outputChannel: Byte;
    readonly preferredInputBufferLength: number;
    readonly preferredOutputBufferLength: number;
}