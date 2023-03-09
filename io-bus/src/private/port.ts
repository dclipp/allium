import { Byte, DeviceProfile } from '@allium/types';
import { IoPort } from '../public/io-port';

export class Port implements IoPort {
    public getClientBufferSize(): number {
        return this._clientToHostBufferSize;
    }

    public getClientReadableLength(): number {
        if (this.isClientToHostReadable()) {
            return this._hostToClientBuffer.flushed.length;
        } else {
            return 0;
        }
    }

    public getClientWritableLength(): number {
        if (this.isClientToHostWritable()) {
            return this._clientToHostBufferSize - this._clientToHostBuffer.flushed.length - this._clientToHostBuffer.unflushed.length;
        } else {
            return 0;
        }
    }

    public readAsClient(): Byte {
        if (this.getClientReadableLength() > 0) {
            //this.debugLog('client read: %', this._hostToClientBuffer.flushed[0]);
            return this._hostToClientBuffer.flushed.splice(0, 1)[0];
        } else {
            throw this.exception('client read', new Error('empty buffer'));
        }
    }
    
    public writeAsClient(b: Byte): boolean {
        if (this.getClientWritableLength() > 0) {
            //this.debugLog('client write: %', b);
            this._clientToHostBuffer.unflushed.push(b);
            return true;
        } else {
            return false;
        }
    }

    public flushAsClient(): void {
        //this.debugLog('client flush: %0 byte(s)', this._clientToHostBuffer.unflushed.length);
        this._clientToHostBuffer.unflushed.splice(0, this._clientToHostBuffer.unflushed.length)
            .forEach(b => this._clientToHostBuffer.flushed.push(b));
    }

    public clearAsClient(): void {
        //this.debugLog('client clear: % byte(s)', this._clientToHostBuffer.unflushed.length);
        this._clientToHostBuffer.unflushed.splice(0, this._clientToHostBuffer.unflushed.length);
    }

    public writeToLog(message: string): void {
        this._appendLogMessage(message);
    }

    public getHostBufferSize(): number {
        return this._hostToClientBufferSize;
    }

    public getHostReadableLength(): number {
        if (this.isHostToClientReadable()) {
            return this._clientToHostBuffer.flushed.length;
        } else {
            return 0;
        }
    }

    public getHostWritableLength(): number {
        if (this.isHostToClientWritable()) {
            return this._hostToClientBufferSize - this._hostToClientBuffer.flushed.length - this._hostToClientBuffer.unflushed.length;
        } else {
            return 0;
        }
    }

    public readAsHost(): Byte {
        if (this.getHostReadableLength() > 0) {
            //this.debugLog('host read: %', this._clientToHostBuffer.flushed[0]);
            return this._clientToHostBuffer.flushed.splice(0, 1)[0];
        } else {
            throw this.exception('host read', new Error('empty buffer'));
        }
    }
    
    public writeAsHost(b: Byte): boolean {
        if (this.getHostWritableLength() > 0) {
            //this.debugLog('host write: %', b);
            this._hostToClientBuffer.unflushed.push(b);
            return true;
        } else {
            return false;
        }
    }

    public flushAsHost(): void {
        //this.debugLog('host flush: %0 byte(s)', this._hostToClientBuffer.unflushed.length);
        this._hostToClientBuffer.unflushed.splice(0, this._hostToClientBuffer.unflushed.length)
            .forEach(b => this._hostToClientBuffer.flushed.push(b));
    }

    public clearAsHost(): void {
        //this.debugLog('host clear: % byte(s)', this._hostToClientBuffer.unflushed.length);
        this._hostToClientBuffer.unflushed.splice(0, this._hostToClientBuffer.unflushed.length);
    }

    public getProfile(): DeviceProfile {
        return this._profile;
    }

    public constructor(clientToHostBufferSize: number, hostToClientBufferSize: number, profile: DeviceProfile, appendLogMessage: (message: string) => void, enableDebugLogging: boolean) {
        this._clientToHostBufferSize = clientToHostBufferSize;
        this._hostToClientBufferSize = hostToClientBufferSize;
        this._profile = profile;
        this._appendLogMessage = appendLogMessage;
        this._enableDebugLogging = enableDebugLogging;
        
        this._clientToHostBuffer = {
            flushed: new Array<Byte>(),
            unflushed: new Array<Byte>()
        };
        this._hostToClientBuffer = {
            flushed: new Array<Byte>(),
            unflushed: new Array<Byte>()
        };
    }

    private isClientToHostReadable(): boolean {
        return this._hostToClientBufferSize > 0;
    }

    private isClientToHostWritable(): boolean {
        return this._clientToHostBufferSize > 0;
    }

    private isHostToClientReadable(): boolean {
        return this._clientToHostBufferSize > 0;
    }

    private isHostToClientWritable(): boolean {
        return this._hostToClientBufferSize > 0;
    }
    
    private debugLog(messageTemplate: string, ...data: Array<(() => any)|Byte|number>): void {
        if (this._enableDebugLogging) {
            let resolvedMessage = messageTemplate;

            let tmpPercentEscape = `__*#pct_${Math.random()}#*__`;
            while (resolvedMessage.includes(tmpPercentEscape)) {
                tmpPercentEscape = `__*#pct_${Math.random()}#*__`;
            }

            while (resolvedMessage.includes('%%')) {
                resolvedMessage = resolvedMessage.replace('%%', tmpPercentEscape);
            }

            const resolvedDataValues = new Map<number, string>();

            let numberedPlaceholderMatch = resolvedMessage.match(/%([0-9]+)/);
            while (!!numberedPlaceholderMatch) {
                const n = Number.parseInt(numberedPlaceholderMatch[1]);
                if (Number.isInteger(n) && n < data.length) {
                    const rdv = resolvedDataValues.get(n);
                    if (rdv === undefined) {
                        const sv = this.stringifyDebugDataValue(tmpPercentEscape, data[n]);
                        resolvedDataValues.set(n, sv);
                        resolvedMessage = resolvedMessage.replace(RegExp(`/%${n}/`, 'g'), sv);
                    } else {
                        resolvedMessage = resolvedMessage.replace(RegExp(`/%${n}/`, 'g'), rdv);
                    }
                } else {
                    resolvedMessage = resolvedMessage.replace(RegExp(`/%${n}/`, 'g'), '?');
                }
            }

            let autoPlaceholderIndex = 0;
            while (resolvedMessage.includes('%')) {
                if (autoPlaceholderIndex < data.length) {
                    const rdv = resolvedDataValues.get(autoPlaceholderIndex);
                    if (rdv === undefined) {
                        const sv = this.stringifyDebugDataValue(tmpPercentEscape, data[autoPlaceholderIndex]);
                        resolvedDataValues.set(autoPlaceholderIndex, sv);
                        resolvedMessage = resolvedMessage.replace('%', sv);
                    } else {
                        resolvedMessage = resolvedMessage.replace('%', rdv);
                    }
                } else {
                    resolvedMessage = resolvedMessage.replace('%', '?');
                }
                autoPlaceholderIndex++;
            }

            while (resolvedMessage.includes(tmpPercentEscape)) {
                resolvedMessage = resolvedMessage.replace(tmpPercentEscape, '%');
            }

            this.writeToLog(`[DEBUG] | info | ${resolvedMessage}`);
        }
    }
    
    private exception(scopeName: string, e: Error): Error {
        if (this._enableDebugLogging) {
            this.writeToLog(`[DEBUG] | error | ${scopeName} | ${e.message}`);
        }
        return e;
    }

    private stringifyDebugDataValue(tmpPercentEscape: string, value: (() => any)|Byte|number|undefined): string {
        let s = '';
        if (value === undefined) {
            s = '(undefined)';
        } else if (typeof value === 'number') {
            s = value.toString();
        } else if (typeof value === 'function') {
            try {
                const o = value();
                if (!!o && !!o._implementationSpec) { // ByteSequence
                    s = o.toString({ radix: 10, padZeroes: true });
                } else if (o === undefined) {
                    s = '(undefined)';
                } else {
                    s = `${o}`;
                }
            } catch (ex) {
                s = '';
            }
        } else {
            s = value.toString({ radix: 10, padZeroes: true });
        }

        while (s.includes('%')) {
            s = s.replace('%', tmpPercentEscape);
        }

        return s;
    }

    private readonly _clientToHostBuffer: {
        readonly flushed: Array<Byte>;
        readonly unflushed: Array<Byte>;
    };
    private readonly _hostToClientBuffer: {
        readonly flushed: Array<Byte>;
        readonly unflushed: Array<Byte>;
    };
    private readonly _clientToHostBufferSize: number;
    private readonly _hostToClientBufferSize: number;
    private readonly _profile: DeviceProfile;
    private readonly _appendLogMessage: (message: string) => void;
    private readonly _enableDebugLogging: boolean;
}