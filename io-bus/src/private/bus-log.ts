import { IoBusLog } from '../public/io-bus-log';

export class BusLog implements IoBusLog {
    public getLatestMessageTimestamp(): number {
        if (this._messages.length > 0) {
            return this._messages[this._messages.length - 1].timestamp;
        } else {
            return 0;
        }
    }

    public clear(forPortIndex?: number): void {
        if (this._messages.length > 0) {
            if (forPortIndex === undefined) {
                this._messages.splice(0, this._messages.length);
            } else {
                const indices = new Array<number>();
                this._messages.forEach((m, i) => {
                    if (m.portIndex === forPortIndex) {
                        indices.push(i);
                    }
                });

                indices.sort((a, b) => b - a).forEach(i => {
                    this._messages.splice(i, 1);
                });
            }
        }
    }

    public getMessages(sinceTimestamp?: number, forPortIndex?: number): Array<{
        readonly timestamp: number;
        readonly portIndex: number;
        readonly value: string;
    }> {
        const messages = sinceTimestamp === undefined
            ? this._messages
            : this._messages.filter(m => m.timestamp >= sinceTimestamp);

        if (forPortIndex === undefined) {
            return messages;
        } else {
            return messages.filter(m => m.portIndex === forPortIndex);
        }
    }

    public appendMessage(portIndex: number, message: string): void {
        this._messages.push({
            timestamp: Date.now(),
            portIndex: portIndex,
            value: message
        });
    }

    private readonly _messages = new Array<{
        readonly timestamp: number;
        readonly portIndex: number;
        readonly value: string;
    }>();
}