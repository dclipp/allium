import { Stage1Object } from '../../../stages/stage-1/stage-1-object';
import { Stage2Object } from '../../../stages/stage-2/stage-2-object';
import { Stage3Object } from '../../../stages/stage-3/stage-3-object';
import { Stage4Object } from '../../../stages/stage-4/stage-4-object';
import { Stage5Object } from '../../../stages/stage-5/stage-5-object';
import { MessageList } from '../../../../messages/message-list';

export interface CompleteParserPayload {
    readonly sourceContent: string;
    readonly stage1: Stage1Object;
    readonly stage2: Stage2Object;
    readonly stage3: Stage3Object;
    readonly stage4: Stage4Object;
    readonly stage5: Stage5Object;
    readonly messages: MessageList;
}