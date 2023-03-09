import { MessageList } from '../../messages/message-list';

export interface StageParserOutput<TStageObject> {
    readonly object: TStageObject;
    readonly messages: MessageList;
}