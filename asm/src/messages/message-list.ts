import { AsmMessage } from './asm-message';
import { AsmMessageClassification } from './asm-message-classification';

export class MessageList {
    public addDistinct(message: AsmMessage): void {
        if (!this.includesFailureMessageForCoordinates(message.contentCoordinates)) {
            this.pushMessage(message);
        }
    }

    public forceAdd(message: AsmMessage): void {
        this.pushMessage(message);
    }

    public merge(otherList: MessageList): void {
        otherList._messages.forEach(m => {
            this.addDistinct(m);
        })
    }

    public toArray(): Array<AsmMessage> {
        return this._messages.map(m => JSON.parse(JSON.stringify(m)) as AsmMessage);
    }

    public includesFailureMessageForCoordinates(contentCoordinates?: { readonly startPosition: number, readonly endPosition: number }): boolean {
        if (!!contentCoordinates && contentCoordinates.startPosition > -1 && contentCoordinates.endPosition > -1) {
            return this._failureRanges.some(fr => fr[0] <= contentCoordinates.startPosition && fr[1] >= contentCoordinates.endPosition);
        } else {
            return false;
        }
    }

    public get hasFailureMessages(): boolean {
        return this._hasFailureMessage;
    }

    public constructor(copyFrom?: MessageList) {
        this._messages = new Array<AsmMessage>();
        this._failureRanges = new Array<[number, number]>();
        this._hasFailureMessage = false;

        if (!!copyFrom) {
            copyFrom._messages.forEach(m => {
                this._messages.push(JSON.parse(JSON.stringify(m)));
            })
            copyFrom._failureRanges.forEach(fr => {
                this._failureRanges.push([fr[0], fr[1]]);
            })
            this._hasFailureMessage = copyFrom._hasFailureMessage;
        }
    }

    private pushMessage(message: AsmMessage): void {
        this._messages.push(message);
        if (message.classification === AsmMessageClassification.Critical || message.classification === AsmMessageClassification.Fatal) {
            this._hasFailureMessage = true;
            if (!!message.contentCoordinates) {
                this._failureRanges.push([message.contentCoordinates.startPosition, message.contentCoordinates.endPosition]);
            }
        }
    }

    private _hasFailureMessage: boolean;
    private readonly _failureRanges: Array<[number, number]>;
    private readonly _messages: Array<AsmMessage>;
}