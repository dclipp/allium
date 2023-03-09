import { DirectiveCommand, DirectiveCommandMap } from '../../../shared/directive/directive-command';
import { S2DirectiveLine } from '../../stage-2/directive/s2-directive-line';
import { S3DirectiveLine } from './s3-directive-line';
import { MessageList } from '../../../../messages/message-list';

export class S3DirectiveParser {
    public static parseDirectiveLine(directiveLine: S2DirectiveLine): {
        line: S3DirectiveLine,
        messages: MessageList
    } {
        const messages = new MessageList();
        let commandText: string = undefined;
        let commandValue: DirectiveCommand = undefined;
        let hasParameter = false;
        let normalizedReceiverName: string = undefined;
        if (!!directiveLine.directive) {
            commandText = directiveLine.directive.normalizedCommandName;
            commandValue = DirectiveCommandMap[commandText];
            hasParameter = directiveLine.directive.hasParameter;
            normalizedReceiverName = directiveLine.directive.normalizedReceiverName;
        }

        const foundLine = commandText !== undefined && commandValue !== undefined;
        const transformation = S3DirectiveParser.transformParameterValue(commandValue, normalizedReceiverName, directiveLine.directive.normalizedParameter)

        return {
            line: foundLine ? {
                lineIndex: directiveLine.lineIndex,
                command: commandValue,
                receiverName: normalizedReceiverName,
                hasParameter: hasParameter,
                parameterValue: transformation.value,
                isImplicitImport: transformation.isImplicitImport
            } : undefined,
            messages: messages
        }

    }

    private static transformParameterValue(command: DirectiveCommand, normalizedReceiverName: string, parameterValue?: string): { value: string, isImplicitImport: boolean } {
        if (command === DirectiveCommand.Import && !!parameterValue && parameterValue.trim().endsWith('::')) { // ?import Abc = Efg:: --> ?import Abc = Efg:Abc
            return {
                value: `${parameterValue.substring(0, parameterValue.indexOf(':')).trim()}:${normalizedReceiverName}`,
                isImplicitImport: true
            }
        } else {
            return {
                value: parameterValue,
                isImplicitImport: false
            };
        }
    }
}