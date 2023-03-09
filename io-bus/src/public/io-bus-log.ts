export interface IoBusLog {
    getLatestMessageTimestamp(): number;
    clear(forPortIndex?: number): void;
    getMessages(sinceTimestamp?: number, forPortIndex?: number): Array<{
        readonly timestamp: number;
        readonly portIndex: number;
        readonly value: string;
    }>;
    appendMessage(portIndex: number, message: string): void;
}
