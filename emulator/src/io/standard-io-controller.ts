import { Byte, ByteSequenceCreator, RealNumber, DoubleByte } from '@allium/types';
import { IoChannel } from './io-channel';
import { IoContext } from './io-context';
import { FunctionScheduler } from '../function-scheduler';
import { CallbacksManager } from './callbacks-manager';
import { IoController, IoSyncState, IoDeviceHooks, IoDirection, IoBidirectionalInstallation, IoReadOnlyInstallation, IoWriteOnlyInstallation, IoSyncStateInput, SerializedIoInstallation } from '@allium/arch';
import { IoMemoryController } from './io-memory-controller';
import { IoLazyHooks } from './io-lazy-hooks';

export class StandardIoController implements IoController {

    public installBidirectional(installation: IoBidirectionalInstallation): void {
        const inputChannelNumeric = ByteSequenceCreator.Unbox(installation.inputChannel);
        const outputChannelNumeric = ByteSequenceCreator.Unbox(installation.outputChannel);
        if (!!this._contexts[inputChannelNumeric] || !!this._contexts[outputChannelNumeric]) {
            throw new Error('install: A device is already installed on one or more of the given channel(s)');
        } else {
            this.validateBufferLengthNumeric('install', installation.preferredInputBufferLength);
            this.validateBufferLengthNumeric('install', installation.preferredOutputBufferLength);

            let inputBufferLength = ByteSequenceCreator.DoubleByte(installation.preferredInputBufferLength);
            if (this._ioMemoryController.available.isLessThan(installation.preferredInputBufferLength)) {
                inputBufferLength = this._ioMemoryController.available.clone();
            }

            const availableAfterInput = this._ioMemoryController.available.computeDifference(inputBufferLength);
            let outputBufferLength = ByteSequenceCreator.DoubleByte(installation.preferredOutputBufferLength);
            if (availableAfterInput.isLessThan(installation.preferredOutputBufferLength)) {
                outputBufferLength = availableAfterInput.clone();
            }

            if (inputBufferLength.isEqualTo(0) || outputBufferLength.isEqualTo(0)) {
                throw new Error('installBidirectional: Not enough IO memory available');
            } else {
                this._ioMemoryController.allocate(inputBufferLength);
                this._ioMemoryController.allocate(outputBufferLength);

                this._contexts[inputChannelNumeric] = {
                    state: IoSyncState.Null,
                    isAttached: false,
                    syncHandle: '',
                    testMode: false,
                    outOfSync: false,
                    entries: new Array<{ readonly timestamp: number; readonly entry: string; }>(),
                    channel: new IoChannel(ByteSequenceCreator.Unbox(inputBufferLength)),
                    hooks: new IoLazyHooks(),
                    direction: IoDirection.In,
                    syncInterval: installation.syncInterval,
                    // installationTitle: 
                };

                this._contexts[outputChannelNumeric] = {
                    state: IoSyncState.Null,
                    isAttached: false,
                    syncHandle: '',
                    testMode: false,
                    outOfSync: false,
                    entries: new Array<{ readonly timestamp: number; readonly entry: string; }>(),
                    channel: new IoChannel(ByteSequenceCreator.Unbox(outputBufferLength)),
                    hooks: new IoLazyHooks(),
                    direction: IoDirection.Out,
                    syncInterval: installation.syncInterval
                };

                const installationKey = this.createInstallationKey(installation.inputChannel, installation.outputChannel);
                this._installations.push({
                    inputChannelNumeric: inputChannelNumeric,
                    outputChannelNumeric: outputChannelNumeric,
                    hooks: new IoLazyHooks(
                        (entry) => {
                            this.appendToLog(installation.inputChannel, entry);
                        },
                        (state) => {
                            this.appendToLog(installation.inputChannel, `channel ${installation.inputChannel.toString()} : reSync: ${state}`);
                            this.appendToLog(installation.outputChannel, `channel ${installation.outputChannel.toString()} : reSync: ${state}`);
                            this.setSyncState(installation.inputChannel, state, false, true);
                            this.setSyncState(installation.outputChannel, state, false, true);
                        }),
                    key: installationKey
                });

                this._installationTitles.set(installationKey, installation.installationTitle || `in${inputChannelNumeric}out${outputChannelNumeric}`);
            }
        }
    }

    public installWriteOnly(installation: IoWriteOnlyInstallation): void {
        const channelNumeric = ByteSequenceCreator.Unbox(installation.channel);
        if (!!this._contexts[channelNumeric]) {
            throw new Error('installWriteOnly: A device is already installed on the given channel');
        } else {
            this.validateBufferLengthNumeric('installWriteOnly', installation.preferredBufferLength);
            let bufferLength = ByteSequenceCreator.DoubleByte(installation.preferredBufferLength);
            if (this._ioMemoryController.available.isLessThan(installation.preferredBufferLength)) {
                bufferLength = this._ioMemoryController.available.clone();
            }

            if (bufferLength.isEqualTo(0)) {
                throw new Error('installWriteOnly: Not enough IO memory available');
            } else {
                this._ioMemoryController.allocate(bufferLength);
                
                this._contexts[channelNumeric] = {
                    state: IoSyncState.Null,
                    isAttached: false,
                    syncHandle: '',
                    testMode: false,
                    outOfSync: false,
                    entries: new Array<{ readonly timestamp: number; readonly entry: string; }>(),
                    channel: new IoChannel(ByteSequenceCreator.Unbox(bufferLength)),
                    hooks: new IoLazyHooks(),
                    direction: IoDirection.In,
                    syncInterval: installation.syncInterval
                };

                const installationKey = this.createInstallationKey(installation.channel, null);
                this._installations.push({
                    inputChannelNumeric: channelNumeric,
                    outputChannelNumeric: -1,
                    hooks: new IoLazyHooks(
                        (entry) => {
                            this.appendToLog(installation.channel, entry);
                        },
                        (state) => {
                            this.appendToLog(installation.channel, `channel ${installation.channel.toString()} : reSync: ${state}`);
                            this.setSyncState(installation.channel, state, false, true);
                        }
                    ),
                    key: installationKey
                });

                this._installationTitles.set(installationKey, installation.installationTitle || `in${channelNumeric}`);
            }
        }
    }

    public installReadOnly(installation: IoReadOnlyInstallation): void {
        const channelNumeric = ByteSequenceCreator.Unbox(installation.channel);
        if (!!this._contexts[channelNumeric]) {
            throw new Error('installReadOnly: A device is already installed on the given channel');
        } else {
            this.validateBufferLengthNumeric('installReadOnly', installation.preferredBufferLength);
            let bufferLength = ByteSequenceCreator.DoubleByte(installation.preferredBufferLength);
            if (this._ioMemoryController.available.isLessThan(installation.preferredBufferLength)) {
                bufferLength = this._ioMemoryController.available.clone();
            }

            if (bufferLength.isEqualTo(0)) {
                throw new Error('installReadOnly: Not enough IO memory available');
            } else {
                this._contexts[channelNumeric] = {
                    state: IoSyncState.Null,
                    isAttached: false,
                    syncHandle: '',
                    testMode: false,
                    outOfSync: false,
                    entries: new Array<{ readonly timestamp: number; readonly entry: string; }>(),
                    channel: new IoChannel(ByteSequenceCreator.Unbox(bufferLength)),
                    hooks: new IoLazyHooks(),
                    direction: IoDirection.Out,
                    syncInterval: installation.syncInterval
                };

                const installationKey = this.createInstallationKey(null, installation.channel);
                this._installations.push({
                    inputChannelNumeric: -1,
                    outputChannelNumeric: channelNumeric,
                    hooks: new IoLazyHooks(
                        (entry) => {
                            this.appendToLog(installation.channel, entry);
                        },
                        (state) => {
                            this.appendToLog(installation.channel, `channel ${installation.channel.toString()} : reSync: ${state}`);
                            this.setSyncState(installation.channel, state, false, true);
                        }
                    ),
                    key: installationKey
                });

                this._installationTitles.set(installationKey, installation.installationTitle || `out${channelNumeric}`);
            }
        }
    }

    // public install(channel: Byte, bufferSize: number, hooks: IoDeviceHooks, direction: IoDirection, syncInterval: number): void {
    //     const channelNumeric = ByteSequenceCreator.Unbox(channel);
    //     if (!!this._contexts[channelNumeric]) {
    //         throw new Error('install: A device is already installed on the given channel');
    //     } else {
    //         this._contexts[channelNumeric] = {
    //             state: IoSyncState.Null,
    //             isAttached: false,
    //             syncHandle: '',
    //             testMode: false,
    //             entries: new Array<{ readonly timestamp: number; readonly entry: string; }>(),
    //             channel: new IoChannel(bufferSize),
    //             hooks: hooks,
    //             direction: direction,
    //             syncInterval: syncInterval
    //         };

    //         hooks.onInstalled(ByteSequenceCreator, RealNumber, {
    //             write: (entry) => {
    //                 this.appendToLog(channel, entry);
    //             }
    //         })
    //     }
    // }

    public uninstall(channel: Byte): void {
        const channelNumeric = ByteSequenceCreator.Unbox(channel);
        if (!!this._contexts[channelNumeric]) {
            const cn = ByteSequenceCreator.Unbox(channel);
            const synchronizationIndex = this._installations.findIndex(s => s.inputChannelNumeric === cn || s.outputChannelNumeric === cn);
            const synchronization = this._installations[synchronizationIndex];

            if (synchronization.inputChannelNumeric > -1) {
                this._ioMemoryController.free(ByteSequenceCreator.DoubleByte(this._contexts[synchronization.inputChannelNumeric].channel.bufferSize));
                this._contexts[synchronization.inputChannelNumeric] = undefined;
                this._callbacks.remove(synchronization.inputChannelNumeric);    
            }
            
            if (synchronization.outputChannelNumeric > -1) {
                this._ioMemoryController.free(ByteSequenceCreator.DoubleByte(this._contexts[synchronization.outputChannelNumeric].channel.bufferSize));
                this._contexts[synchronization.outputChannelNumeric] = undefined;
                this._callbacks.remove(synchronization.outputChannelNumeric);    
            }

            this._installationTitles.delete(synchronization.key);
            this._installations.splice(synchronizationIndex, 1);
        } else {
            throw this.notInstalledException('uninstall');
        }
    }

    public provideHooks(channel: Byte, hooks: IoDeviceHooks): void {
        const channelNumeric = ByteSequenceCreator.Unbox(channel);
        let found = false;
        if (!!this._contexts[channelNumeric]) {
            const installationIndex = this._installations.findIndex(s => s.inputChannelNumeric === channelNumeric || s.outputChannelNumeric === channelNumeric);
            if (installationIndex > -1) {
                this._installations[installationIndex].hooks.loadHooks(hooks);
                found = true;
            }
        }
        
        if (!found) {
            throw this.notInstalledException('provideHooks');
        }
    }
    
    public attach(channel: Byte): void {
        let success = false;
        const context = this.getContext(channel);
        if (context !== false) {
            if (!context.isAttached) {
                context.isAttached = true;
                success = true;
                
                if (context.direction === IoDirection.In) {
                    context.hooks.onAttachedOrDetached({
                        direction: IoDirection.In,
                        bufferLength: context.channel.bufferSize,
                        canTake: () => {
                            return this.canTake(channel);
                        },
                        take: (count: number) => {
                            return this.take(channel, count);
                        }
                    });
                } else {
                    context.hooks.onAttachedOrDetached({
                        direction: IoDirection.Out,
                        bufferLength: context.channel.bufferSize,
                        canPut: () => {
                            return this.canPut(channel);
                        },
                        put: (data: Byte) => {
                            this.put(channel, data);
                        },
                        flush: () => {
                            this.flush(channel);
                        }
                    });
                }

                // if (context.syncInterval > 0) {
                    const syncHandle = this._scheduler.timeout(context.syncInterval, () => {
                        this.setSyncState(channel, IoSyncState.Null, true);
                    });
                    const sync = this.getSyncFn(channel);
                    sync((state) => {
                        this._scheduler.cancel(syncHandle);
                        this.setSyncState(channel, state);
                        this.beginChannelSync(channel);
                    });
                // } else {
                //     this.setSyncState(channel, IoSyncState.Ready);
                // }
            }
        }

        if (!success) {
            throw new Error('attach: Device is not installed or is already attached');
        }
    }

    public detach(channel: Byte): void {
        let success = false;
        const context = this.getContext(channel);
        if (context !== false) {
            if (context.isAttached) {
                context.isAttached = false;
                success = true;
                this._scheduler.cancel(context.syncHandle);
                context.syncHandle = '';
                context.hooks.onAttachedOrDetached(false);
            }
        }

        if (!success) {
            throw new Error('detach: Device is not installed or is not attached');
        }
    }

    public statuses(): Array<{ readonly channel: Byte; readonly state: IoSyncState; readonly installationKey: string; readonly installationTitle: string; }> {
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
                    installationTitle: this._installationTitles.get(installationKey)!
                }
            } else {
                return null;
            }
        }).filter(x => x !== null).map(x => x!);
    }

    public canPut(channel: Byte): number {
        let count = 0;
        const context = this.getContext(channel);
        if (context !== false && context.state === IoSyncState.Ready) {
            count = context.channel.preproducibleLength();
        }

        return count;
    }

    public put(channel: Byte, data: Byte): void {
        let success = false;
        const context = this.getContext(channel);
        if (context !== false && context.state === IoSyncState.Ready) {
            if (context.channel.preproducibleLength() > 0) {
                context.channel.preproduce(data);
                success = true;
            }
        }

        if (success !== true) {
            throw new Error('put: Not enough space to append data');
        }
    }

    public flush(channel: Byte): void {
        const context = this.getContext(channel);
        if (context === false) {
            throw this.notInstalledException('flush');
        } else if (context.state !== IoSyncState.Ready) {
            throw new Error('flush: Device is not ready');
        } else {
            context.channel.produce();
            if ((context.isAttached || context.testMode) && context.direction === IoDirection.In) {
                context.hooks.onDataReceived();
           }
            // const installationIndex = this._installations.findIndex(s => channel.isEqualTo(s.inputChannelNumeric));
            // // const outputChannel = this.getContext(ByteSequenceCreator.Byte(this._installations[installationIndex].inputChannelNumeric));
            // // if (!!outputChannel && (outputChannel.isAttached || outputChannel.testMode)) {
            //     this._installations[installationIndex].hooks.onDataReceived();
            // // }
        }
    }
    
    public canTake(channel: Byte): number {
        let count = 0;
        const context = this.getContext(channel);
        if (context !== false && context.state === IoSyncState.Ready) {
            count = context.channel.consumableLength();
        }

        return count;
    }

    public take(channel: Byte, count: number): Array<Byte> {
        let bytes: Array<Byte> | null = null;
        const context = this.getContext(channel);
        if (context !== false && context.state === IoSyncState.Ready) {
            if (context.channel.consumableLength() >= count) {
                bytes = context.channel.consume(count);
            }
        }

        if (bytes === null) {
            throw new Error('take: count is greater than the number of available bytes');
        } else {
            return bytes;
        }
    }

    public getDirection(channel: Byte): IoDirection | false {
        let direction: IoDirection | false = false;
        const context = this.getContext(channel);
        if (context !== false && context.state === IoSyncState.Ready) {
            direction = context.direction;
        }

        return direction;
    }
    
    public appendToLog(channel: Byte, entry: string): void {
        const context = this.getContext(channel);
        if (context !== false) {
            const logEntry = {
                timestamp: Date.now(),
                entry: entry
            };
            
            if (context.entries.length === this._maxLogLength) {
                context.entries.splice(0, 1);
            }
            context.entries.push(logEntry);
            this._callbacks.notify(ByteSequenceCreator.Unbox(channel), logEntry);
        }
    }

    public clearLog(channel: Byte): void {
        const context = this.getContext(channel);
        if (context !== false) {
            context.entries.splice(0, context.entries.length);
        }
    }

    public getLog(channel: Byte): Array<{ readonly timestamp: number; readonly entry: string; }> {
        let entries: Array<{ readonly timestamp: number; readonly entry: string; }> | null = null;
        const context = this.getContext(channel);
        if (context !== false) {
            entries = context.entries.map(e => {
                return {
                    timestamp: e.timestamp,
                    entry: e.entry
                }
            })
        }

        if (entries === null) {
            throw this.notInstalledException('getLog');
        } else {
            return entries;
        }
    }

    public log(channel: Byte, listener: (latest: { readonly timestamp: number, readonly entry: string }) => void): { unsubscribe(): void } {
        const cnm = ByteSequenceCreator.Unbox(channel);
        if (!!this._contexts[cnm]) {
            const cbHandle = this._callbacks.subscribe(cnm, listener);
            return {
                unsubscribe: () => {
                    this._callbacks.unsubscribe(cbHandle);
                }
            }
        } else {
            throw this.notInstalledException('log');
        }
    }

    public serialize(): Array<SerializedIoInstallation> {
        const serializedInstallations = new Array<SerializedIoInstallation>();
        this._installationTitles.forEach((installationKey, installationTitle) => {
            const channelNumerics = this.getChannelNumericsFromInstallationKey(installationKey);
            const inputContext = channelNumerics.inputChannelNumeric !== null ? this.getContext(ByteSequenceCreator.Byte(channelNumerics.inputChannelNumeric)) : false;
            const outputContext = channelNumerics.outputChannelNumeric !== null ? this.getContext(ByteSequenceCreator.Byte(channelNumerics.outputChannelNumeric)) : false;
            serializedInstallations.push({
                input: inputContext === false
                    ? null
                    : {
                        channelNumeric: channelNumerics.inputChannelNumeric,
                        state: inputContext.state,
                        isAttached: inputContext.isAttached,
                        testMode: inputContext.testMode,
                        outOfSync: inputContext.outOfSync,
                        logEntries: inputContext.entries.map(e => e),
                        buffer: inputContext.channel.serialize(),
                        direction: inputContext.direction,
                        syncInterval: inputContext.syncInterval
                    },
                output: outputContext === false
                    ? null
                    : {
                        channelNumeric: channelNumerics.outputChannelNumeric,
                        state: outputContext.state,
                        isAttached: outputContext.isAttached,
                        testMode: outputContext.testMode,
                        outOfSync: outputContext.outOfSync,
                        logEntries: outputContext.entries.map(e => e),
                        buffer: outputContext.channel.serialize(),
                        direction: outputContext.direction,
                        syncInterval: outputContext.syncInterval
                    },
                title: installationTitle
            });
        });

        return serializedInstallations;
    }

    public constructor(scheduler: FunctionScheduler, capacity: DoubleByte, maxLogLength?: number) {
        this._contexts = {};
        this._scheduler = scheduler;
        this._callbacks = new CallbacksManager(scheduler);
        this._installations = new Array<{
            readonly inputChannelNumeric: number;
            readonly outputChannelNumeric: number;
            readonly hooks: IoLazyHooks;
            readonly key: string;
        }>();
        this._installationTitles = new Map<string, string>();
        this._ioMemoryController = new IoMemoryController(capacity);
        this._maxLogLength = maxLogLength || 32768;
    }

    protected notInstalledException(scopeName: string): string {
        return `${scopeName}: No device installed on the given channel`;
    }

    protected getContext(channel: Byte): IoContext | false {
        const channelNumeric = ByteSequenceCreator.Unbox(channel);
        const c = this._contexts[channelNumeric];
        if (!!c) {
            return c;
        } else {
            return false;
        }
    }

    private setSyncState(channel: Byte, state: IoSyncState, outOfSync?: boolean, ifNullOnly?: boolean): void {
        const context = this.getContext(channel);
        if (context !== false) {
            if (ifNullOnly !== true || context.state === IoSyncState.Null) {
                context.state = state;
                if (outOfSync === true) {
                    context.outOfSync = true;
                    context.hooks.onOutOfSync();
                    this._scheduler.cancel(context.syncHandle);
                } else if (outOfSync === false) {
                    context.outOfSync = false;
                }
            }
        }
    }

    private beginChannelSync(channel: Byte): void {
        const context = this.getContext(channel);
        if (context !== false) {
            context.syncHandle = this._scheduler.interval(context.syncInterval, () => {
                const timeoutHandle = this._scheduler.timeout(context.syncInterval, () => {
                    this.setSyncState(channel, IoSyncState.Null, true);
                });
                const sync = this.getSyncFn(channel);
                sync((state) => {
                    this._scheduler.cancel(timeoutHandle);
                    this.setSyncState(channel, state);
                });
            });
        }
    }

    private getSyncState(channel: Byte): IoSyncState {
        let state: IoSyncState = IoSyncState.Null;
        const context = this.getContext(channel);
        if (context !== false) {
            state = context.state;
        }
        return state;
    }

    private getSyncFn(channel: Byte): (sync: (state: IoSyncStateInput) => void) => void {
        const cn = ByteSequenceCreator.Unbox(channel);
        const installation = this._installations.find(s => s.inputChannelNumeric === cn || s.outputChannelNumeric === cn);
        if (!!installation) {
            return (then) => {
                installation.hooks.sync(then);
            };
        } else {
            throw this.notInstalledException('getSyncFn');
        }
    }

    private validateBufferLengthNumeric(scopeName: string, length: number): void {
        if (Number.isNaN(length)) {
            throw new Error(`${scopeName}: Length is not a number (NaN)`);
        } else {
            const twoSixteen = Math.pow(2, 16);
            if (length >= twoSixteen) {
                throw new Error(`${scopeName}: Buffer length must be less than ${twoSixteen}`);
            }
        }
    }

    private createInstallationKey(inputChannel: Byte | null, outputChannel: Byte | null): string {
        // I{hex input | n}.O{hex output | n}
        const key1 = !!inputChannel ? inputChannel.toString({ radix: 16, padZeroes: true }) : 'n';
        const key2 = !!outputChannel ? outputChannel.toString({ radix: 16, padZeroes: true }) : 'n';
        return `I${key1}.O${key2}`;
    }

    protected findInstallationKeyForChannel(channel: Byte): string {
        const cn = ByteSequenceCreator.Unbox(channel);
        const installationIndex = this._installations.findIndex(i => i.inputChannelNumeric === cn || i.outputChannelNumeric === cn);
        if (installationIndex > -1) {
            return this._installations[installationIndex].key;
        } else {
            throw this.notInstalledException('findInstallationKeyForChannel');
        }
    }

    protected getChannelNumericsFromInstallationKey(installationKey: string): {
        readonly inputChannelNumeric: number | null,
        readonly outputChannelNumeric: number | null
    } {
        const channelKeys = installationKey.split('.');
        let inputChannelNumeric: number | null = null;
        let outputChannelNumeric: number | null = null;
        
        if (channelKeys[0] !== 'In') {
            inputChannelNumeric = Number.parseInt(channelKeys[0].substring(1), 16);
        }

        if (channelKeys[1] !== 'On') {
            outputChannelNumeric = Number.parseInt(channelKeys[0].substring(1), 16);
        }
        
        return {
            inputChannelNumeric: inputChannelNumeric,
            outputChannelNumeric: outputChannelNumeric
        }
    }

    protected readonly _installationTitles: Map<string, string>;

    protected readonly _installations: Array<{
        readonly inputChannelNumeric: number;
        readonly outputChannelNumeric: number;
        readonly hooks: IoLazyHooks;
        readonly key: string;
    }>;

    protected readonly _contexts: {
        [channelNumeric: number]: IoContext | undefined;
    }
    private readonly _scheduler: FunctionScheduler;
    private readonly _callbacks: CallbacksManager<{ readonly timestamp: number, readonly entry: string }>;
    private readonly _ioMemoryController: IoMemoryController;
    private readonly _maxLogLength: number;
}