import { AsmMessage } from '../../../messages/asm-message';
import { AsmMessageHelper } from '../../../messages/asm-message-helper';
import { AsmMessageTemplate } from '../../../messages/asm-message-template';
import { ASM_MESSAGES } from '../../../messages/asm-messages';

export interface ViewTest<TInput, TView> {
    readonly testDescription: string;
    readonly input: TInput;
    readonly expectedMessages: Array<AsmMessage>;
    readonly expectedView: TView;
}

export const ViewTestInputEscapes: {
    readonly Space: ['~s', ' '],
    readonly Tab: ['~t', '\t'],
    readonly NewLine: ['~n', '\n'],
    readonly CarriageReturn: ['~r', '\r'],
    readonly Tilde: ['~~', '~'],
} = {
    Space: ['~s', ' '],
    Tab: ['~t', '\t'],
    NewLine: ['~n', '\n'],
    CarriageReturn: ['~r', '\r'],
    Tilde: ['~~', '~']
}

export const ViewTestInputConstants: {
    readonly EmptyString: ['~!EMPTY', ''],
    readonly NullString: ['~!NULL', null]
} = {
    EmptyString: ['~!EMPTY', ''],
    NullString: ['~!NULL', null]
}

export interface ViewTestResult {
    readonly testDescription: string;
    readonly passed: boolean;
    readonly failures: Array<string>;
}

export class ViewTestHelper {
    public static parseInput(input: string): string {
        let workingString = input;
        const constantTarget = Object.keys(ViewTestInputConstants).find(k => input === ViewTestInputConstants[k][0]);
        if (!!constantTarget) {
            return ViewTestInputConstants[constantTarget][1];
        } else {
            Object.keys(ViewTestInputEscapes).forEach(k => {
                const escape = ViewTestInputEscapes[k][0];
                const replacement = ViewTestInputEscapes[k][1];
                while (workingString.includes(escape)) {
                    workingString = workingString.replace(escape, replacement);
                }
            })
            return workingString;
        }
    }

    private static findContentCoordFailure(expectedCoords:
        { startPosition: number, endPosition: number } | undefined,
        actualCoords: { startPosition: number, endPosition: number } | undefined): string {
        if (expectedCoords === undefined && actualCoords !== undefined) {
            return `Message contentCoordinates mismatch: Expected undefined but actual has value`;
        } else if (expectedCoords !== undefined && actualCoords === undefined) {
            return `Message contentCoordinates mismatch: Expected value but actual is undefined`;
        } else if (!!expectedCoords && !!actualCoords) {
            if (expectedCoords.startPosition === actualCoords.startPosition && expectedCoords.endPosition === actualCoords.endPosition) {
                return null;
            } else {
                const expectedCoordsStr = !!expectedCoords
                    ? `{ start = ${expectedCoords.startPosition}, end = ${expectedCoords.endPosition} }`
                    : '<undefined>';
                const actualCoordsStr = !!actualCoords
                    ? `{ start = ${actualCoords.startPosition}, end = ${actualCoords.endPosition} }`
                    : '<undefined>';
                return `Message contentCoordinates mismatch: Expected = ${expectedCoordsStr}, Actual = ${actualCoordsStr}`;
            }
        } else {
            return null;
        }
    }

    public static findMessageFailures(expectedMessages: Array<AsmMessage>, actualMessages: Array<AsmMessage>): Array<string> {
        const failureMessages = new Array<string>();
        if (expectedMessages.length !== actualMessages.length) {
            failureMessages.push('Messages array length mismatch');
        }

        if (expectedMessages.length > 0) {
            expectedMessages.forEach((t, i) => {
                if (actualMessages.length > i) {
                    if (actualMessages[i].code !== t.code) {
                        failureMessages.push(`Message code mismatch: Expected = ${t.code}, Actual = ${actualMessages[i].code}`);
                    }

                    if (actualMessages[i].classification !== t.classification) {
                        failureMessages.push(`Message classification mismatch: Expected = ${t.classification}, Actual = ${actualMessages[i].classification}`);
                    }

                    const coordFailure = ViewTestHelper.findContentCoordFailure(t.contentCoordinates || undefined, actualMessages[i].contentCoordinates || undefined);
                    if (!!coordFailure) {
                        failureMessages.push(coordFailure);
                    }
                } else {
                    failureMessages.push(`Message missing: Expected message with code = ${t.code}, but it was not found in Actual`);
                }
            })
        }

        if (actualMessages.length > 0) {
            actualMessages.forEach((t, i) => {
                if (expectedMessages.length > i) {
                    if (expectedMessages[i].code !== t.code) {
                        failureMessages.push(`Message code mismatch: Expected = ${expectedMessages[i].code}, Actual = ${t.code}`);
                    }

                    if (expectedMessages[i].classification !== t.classification) {
                        failureMessages.push(`Message classification mismatch: Expected = ${expectedMessages[i].classification}, Actual = ${t.classification}`);
                    }

                    const coordFailure = ViewTestHelper.findContentCoordFailure(expectedMessages[i].contentCoordinates || undefined, t.contentCoordinates || undefined);
                    if (!!coordFailure) {
                        failureMessages.push(coordFailure);
                    }
                } else {
                    failureMessages.push(`Unexpected message: code = ${t.code}`);
                }
            })
        }

        if (failureMessages.length > 0) {
            const distinctMessages = new Array<string>();
            failureMessages.forEach(m => {
                if (!distinctMessages.includes(m)) {
                    distinctMessages.push(m);
                }
            })
            return distinctMessages;
        } else {
            return [];
        }
    }

    public static parseTestDefinition<TInput, TView>(json: string, expectedViewParser: (j: string) => TView, inputParser: (j: string) => TInput): ViewTest<TInput, TView> {
        const testDescription = (JSON.parse(json) as { testDescription: string }).testDescription;
        const input = inputParser(json);
        const expectedView = expectedViewParser(json);
        const expectedMessageNames = (JSON.parse(json) as { expectedMessages: string[] }).expectedMessages;
        const expectedMessages = !!expectedMessageNames ? expectedMessageNames.map(n => {
            const segments = n.split('.');
            const areaName = segments[0];
            const messageName = segments[1];
            const message: AsmMessageTemplate = ASM_MESSAGES.Parser[areaName][messageName];
            const messageCoordinates = message.hasCoordinates
                ? { startPosition: parseInt(segments[2]), endPosition: parseInt(segments[3]) }
                : undefined;
            
            return AsmMessageHelper.generateMessage(ASM_MESSAGES.Parser[areaName][messageName], messageCoordinates);
        }) : [];

        return {
            testDescription: testDescription,
            input: input,
            expectedMessages: expectedMessages,
            expectedView: expectedView
        }
    //     readonly testDescription: string;
    // readonly input: TInput;
    // readonly expectedMessages: Array<AsmMessage>;
    // readonly expectedView: TView;
    }

    public static getUnexpectedFailureString(err: any): string {
        return `Unexpected exception: ${err}`;
    }

    public static tryGetTestDescription(json: string): string {
        try {
            const o = JSON.parse(json) as { testDescription: string };
            return o.testDescription || '<Unknown name>';
        } catch (e) {
            return '<Unknown name>';
        }
    }
}