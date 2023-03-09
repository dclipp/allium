import { QuadByte } from '../data/quad-byte';
import { DeviceServiceClass } from './device-service-class';

export interface DeviceProfile {
    readonly primaryDeviceIdentifier: QuadByte;
    readonly secondaryDeviceIdentifier: QuadByte;
    readonly clientToHostBufferSize: number;
    readonly hostToClientBufferSize: number;
    readonly serviceClass: DeviceServiceClass;
    readonly extendedServiceClass: number;
}