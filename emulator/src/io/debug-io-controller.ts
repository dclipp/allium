import { Byte, ByteSequenceCreator, DoubleByte } from '@allium/types';
import { IoSyncState, IoDirection } from '@allium/arch';
import { FunctionScheduler } from '../function-scheduler';
import { StandardIoController } from './standard-io-controller';

export class DebugIoController extends StandardIoController {

    public statuses(): Array<{ readonly channel: Byte; readonly state: IoSyncState; readonly installationKey: string; readonly installationTitle: string; readonly testMode: boolean; }> {
        return Object.keys(this._contexts).map(k => {
            const cnm = Number.parseInt(k);
            const context = this._contexts[cnm];
            if (!!context) {
                const channelByte = ByteSequenceCreator.Byte(cnm);
                const installationKey = this.findInstallationKeyForChannel(channelByte);
                return {
                    channel: channelByte,
                    state: context.state,
                    installationKey: installationKey,
                    installationTitle: this._installationTitles.get(installationKey)!,
                    testMode: context.testMode
                }
            } else {
                return null;
            }
        }).filter(x => x !== null).map(x => x!);
    }

    public enterTestMode(channel: Byte): void {
        const context = this.getContext(channel);
        if (context === false) {
            throw this.notInstalledException('enterTestMode');
        } else {
            context.testMode = true;
        }
    }

    public exitTestMode(channel: Byte): void {
        const context = this.getContext(channel);
        if (context === false) {
            throw this.notInstalledException('exitTestMode');
        } else {
            context.testMode = false;
        }
    }

    public testPut(channel: Byte, data: Byte): void {
        let success = false;
        const context = this.getContext(channel);
        if (context !== false && context.direction === IoDirection.Out) {//TODO test mode?, logging
            if (context.channel.preproducibleLength() > 0) {
                context.channel.preproduce(data);
                success = true;
            }
        }

        if (success !== true) {
            throw new Error('put: Not enough space to append data');
        }
    }
    
    public constructor(scheduler: FunctionScheduler, capacity: DoubleByte, maxLogLength?: number) {
        super(scheduler, capacity, maxLogLength);
    }
}
