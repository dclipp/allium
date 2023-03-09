import { GlobalPass } from './global-pass';
import { CompleteParserPayload } from '../shared/parser-types/internal-payload/complete-parser-payload';
import { PassDetails } from '../shared/parser-types/pass-details';

export interface InternalGlobalPass extends GlobalPass {
    readonly completePayload: CompleteParserPayload;
    readonly details: PassDetails;
}