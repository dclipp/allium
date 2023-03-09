import { StageParserOutput } from '../stage-parser-output';
import { Stage4Object } from './stage-4-object';
import { S4LabelLine } from './s4-label-line';
import { ByteSequenceCreator, INSTRUCTION_BYTE_COUNT } from '@allium/types';
import { S4InstructionLine } from './s4-instruction-line';
import { InstructionArgumentKind } from '../../shared/kinds/instruction-argument-kind';
import { PassDetails } from '../../shared/parser-types/pass-details';
import { ParseOptions } from '../../parse-options';
import { MessageList } from '../../../messages/message-list';
import { StageParser } from '../stage-parser';
import { WorkingParserPayload } from '../../shared/parser-types/internal-payload/working-parser-payload';
import { S4AutoAddressRef } from './s4-auto-address-ref';
import { S4AutoAddressRefParser } from './s4-auto-address-ref-parser';

class Stage4Parser {
    public static parse(workingPayload: WorkingParserPayload, passDetails: PassDetails, options: ParseOptions): StageParserOutput<Stage4Object> {
        const messages = new MessageList();
        const prelimInstructionLines = workingPayload.stage3.instructionLines;

        const labelLines: Array<S4LabelLine> = workingPayload.stage3.labelLines.filter(ln => !ln.isEmbedded).map(ln => {
            return {
                blockAddress: ByteSequenceCreator.QuadByte(prelimInstructionLines.filter(il => il.lineIndex < ln.lineIndex).length * INSTRUCTION_BYTE_COUNT),
                lineIndex: ln.lineIndex
            }
        })

        const instructionLines: Array<S4InstructionLine> = prelimInstructionLines.map(il => {
            const associatedLabel = labelLines.find((lbl, i, arr) => lbl.lineIndex < il.lineIndex && !arr.some(x => x.lineIndex > lbl.lineIndex && x.lineIndex < il.lineIndex));
            let blockLabelName = '';
            if (!!associatedLabel) {
                blockLabelName = workingPayload.stage3.labelLines.find(x => x.lineIndex === associatedLabel.lineIndex).normalizedName;
            // } else {
            //     const startToken = allTokens.find(t => t.index === il.mnemonic.tokenIndices[0]);
            //     const endToken = il.argumentList.length > 0 ?
            //         allTokens[il.argumentList[il.argumentList.length - 1].tokenIndices[il.argumentList[il.argumentList.length - 1].tokenIndices.length - 1]] : startToken;
            //     messages.push(AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser.ImmediateView.UnlabeledBlock, {
            //         startPosition: !!startToken ? startToken.startPosition : 0,
            //         endPosition: !!endToken ? endToken.endPosition : 0
            //     }))
            }

            const autoAddressRefs = new Array<S4AutoAddressRef>();
            il.argumentList
                .filter(a => a.determinedKind === InstructionArgumentKind.AutoAddressRef)
                .forEach(a => {
                    const alr = S4AutoAddressRefParser.parseAutoAddressRef(
                        il.mnemonic,
                        a, workingPayload.stage3,
                        labelLines,
                        workingPayload.stage1.tokens,
                        passDetails,
                        options.useMockForExternalAddresses);
                    messages.merge(alr.messages);
                    autoAddressRefs.push(alr.autoAddressRef);
                });

            return {
                blockLabelName: blockLabelName,
                autoAddressRefs: autoAddressRefs,
                lineIndex: il.lineIndex
            }
        })


        return {
            object: {
                labelLines: labelLines,
                instructionLines: instructionLines
            },
            messages: messages
        }
    }
}

export const parseStage4: StageParser<Stage4Object> = Stage4Parser.parse;