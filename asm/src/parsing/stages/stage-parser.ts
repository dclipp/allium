import { WorkingParserPayload } from '../shared/parser-types/internal-payload/working-parser-payload';
import { StageParserOutput } from './stage-parser-output';
import { PassDetails } from '../shared/parser-types/pass-details';
import { ParseOptions } from '../parse-options';

export interface StageParser<TStageObject> {
    (workingPayload: WorkingParserPayload, passDetails: PassDetails, options: ParseOptions): StageParserOutput<TStageObject>;
}