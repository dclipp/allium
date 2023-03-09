import { IoDeviceHooks, IoSyncStateInput, IoDelegate } from '@allium/arch';
import { ByteSequenceCreator, RealNumber } from '@allium/types';

export class IoLazyHooks implements IoDeviceHooks {
    public onAttachedOrDetached(delegate: IoDelegate | false): void {
        if (!!this._hooks) {
            this._hooks.onAttachedOrDetached(delegate);
        } else {
            this._deferredCalls.push((h) => h.onAttachedOrDetached(delegate));
        }
    }

    public onDataReceived(): void {
        if (!!this._hooks) {
            this._hooks.onDataReceived();
        } else {
            this._deferredCalls.push((h) => h.onDataReceived());
        }
    }

    public onInstalled(byteSequenceCreator: typeof ByteSequenceCreator, realNumber: typeof RealNumber, deviceLog: { write(entry: string): void }, reSync: (state: IoSyncStateInput) => void): void {
        if (!!this._hooks) {
            this._hooks.onInstalled(byteSequenceCreator, realNumber, deviceLog, reSync);
        }
    }

    public onOutOfSync(): void {
        if (!!this._hooks) {
            this._hooks.onOutOfSync();
        } else {
            this._deferredCalls.push((h) => {
                h.onOutOfSync();
            });
        }
    }

    public sync(then: (state: IoSyncStateInput) => void): void {
        if (!!this._hooks) {
            this._hooks.sync(then);
        } else {
            this._deferredCalls.push((h) => {
                h.sync(then);
            });
        }
    }

    public loadHooks(hooks: IoDeviceHooks): void {
        if (this.isLoaded()) {
            throw new Error('Hooks have already been loaded');
        } else {
            this._hooks = hooks;
            while (this._deferredCalls.length > 0) {
                this._deferredCalls.splice(0, 1)[0](this._hooks);
            }

            if (!!this._deviceLogWrite && !!this._reSync) {
                this._hooks.onInstalled(
                    ByteSequenceCreator,
                    RealNumber,
                    {
                        write: (entry) => {
                            this._deviceLogWrite(entry);
                        }
                    },
                    (state) => {
                        this._reSync(state);
                    });
            }
        }
    }

    public isLoaded(): boolean {
        return !!this._hooks;
    }

    public constructor(deviceLogWrite?: (entry: string) => void, reSync?: (state: IoSyncStateInput) => void) {
        this._deferredCalls = new Array<(h: IoDeviceHooks) => void>();
        this._hooks = null;
        if (!!deviceLogWrite && !!reSync) {
            this._deviceLogWrite = deviceLogWrite;
            this._reSync = reSync;
        } else {
            this._deviceLogWrite = null;
            this._reSync = null;
        }
    }

    private _hooks: IoDeviceHooks | null;
    private readonly _deviceLogWrite: ((entry: string) => void) | null;
    private readonly _reSync: ((state: IoSyncStateInput) => void) | null;
    private readonly _deferredCalls: Array<(h: IoDeviceHooks) => void>;
}