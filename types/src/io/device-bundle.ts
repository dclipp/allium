import { DeviceProfile } from './device-profile';
import { DeviceMetadata } from './device-metadata';

export interface DeviceBundle {
    readonly bundleId: string;
    readonly profile: DeviceProfile;
    readonly metadata: DeviceMetadata;
}