import { ViewTestResult, ViewTestHelper } from '../common/view-test';
import { Token } from '../stage-1/token';
import { S2InstructionArgument } from './instruction/s2-instruction-argument';
import { S2InstructionParser } from './instruction/s2-instruction-parser';

export class StructuralViewTester {
    public static instructionLineSingle(json: string): ViewTestResult {
        try {
            //allTokens: Array<Token>, mnemonicTokenIndex: number, lastTokenIndexInLine: number): { args: Array<StructuralViewInstructionArgument>, messages: Array<ViewParserMessage> }
            const test = ViewTestHelper.parseTestDefinition(
                json,
                (j) => {//{ args: Array<StructuralViewInstructionArgument>, messages: Array<ViewParserMessage> }
                    return JSON.parse(j).expectedView as Array<S2InstructionArgument>;
                },
                (j) => {//{ allTokens: Array<Token>, mnemonicTokenIndex: number, lastTokenIndexInLine: number }
                    const unescapedInput = JSON.parse(j) as { input: { allTokens: Array<Token>, mnemonicTokenIndex: number, lastTokenIndexInLine: number } };
                    return {
                        allTokens: unescapedInput.input.allTokens.map(t => {
                            return {
                                index: t.index,
                                startPosition: t.startPosition,
                                endPosition: t.endPosition,
                                length: t.length,
                                text: ViewTestHelper.parseInput(t.text)
                            }
                        }),
                        mnemonicTokenIndex: unescapedInput.input.mnemonicTokenIndex,
                        lastTokenIndexInLine: unescapedInput.input.lastTokenIndexInLine
                    }
                });

            const output = S2InstructionParser.parseInstructionArguments(test.input.allTokens, 0, test.input.mnemonicTokenIndex, test.input.lastTokenIndexInLine);
            const viewFailures = StructuralViewTester.findViewFailures(test.expectedView, output.args);
            // const tokenFailures = StructuralViewParser.findTokenFailures(test.expectedView, output.args.map(a => a.tokenIndices))
            const messageFailures = ViewTestHelper.findMessageFailures(test.expectedMessages, output.messages);

            return {
                passed: viewFailures.length === 0 && messageFailures.length === 0,
                failures: viewFailures.concat(messageFailures),
                testDescription: test.testDescription
            }
        } catch (err) {
            return {
                passed: false,
                failures: [ViewTestHelper.getUnexpectedFailureString(err)],
                testDescription: ViewTestHelper.tryGetTestDescription(json)
            }
        }
    }

    public static instructionLineList(json: string): Array<ViewTestResult> {
        const testJsonObjects = JSON.parse(json) as any[];
        return testJsonObjects.map(o => StructuralViewTester.instructionLineSingle(JSON.stringify(o)));
    }

    private static findTokenFailures(expectedToken: Token, actualToken: Token): Array<string> {
        const failureMessages = new Array<string>();

        if (expectedToken.text !== actualToken.text) {
            failureMessages.push(`Token text mismatch: Expected = '${expectedToken.text}', Actual = '${actualToken.text}'`);
        }

        if (expectedToken.index !== actualToken.index) {
            failureMessages.push(`Token index mismatch: Expected = ${expectedToken.index}, Actual = ${actualToken.index}`);
        }

        if (expectedToken.startPosition !== actualToken.startPosition) {
            failureMessages.push(`Token startPosition mismatch: Expected = ${expectedToken.startPosition}, Actual = ${actualToken.startPosition}`);
        }

        if (expectedToken.endPosition !== actualToken.endPosition) {
            failureMessages.push(`Token endPosition mismatch: Expected = ${expectedToken.endPosition}, Actual = ${actualToken.endPosition}`);
        }

        if (expectedToken.length !== actualToken.length) {
            failureMessages.push(`Token length mismatch: Expected = ${expectedToken.length}, Actual = ${actualToken.length}`);
        }

        return failureMessages;
    }

    private static findViewFailures(expectedView: Array<S2InstructionArgument>, actualView: Array<S2InstructionArgument>): Array<string> {
        const failureMessages = new Array<string>();
        if (expectedView.length !== actualView.length) {
            failureMessages.push('Args array length mismatch');
        }

        if (expectedView.length > 0) {
            expectedView.forEach((t, i) => {
                if (actualView.length > i) {
                    if (actualView[i].assumedArgKind !== t.assumedArgKind) {
                        failureMessages.push(`assumedArgKind mismatch: Expected = ${t.assumedArgKind}, Actual = ${actualView[i].assumedArgKind}`);
                    }

                    if (actualView[i].tokenIndices.length !== t.tokenIndices.length) {
                        failureMessages.push(`tokenIndices array length mismatch: Expected = ${t.tokenIndices.length}, Actual = ${actualView[i].tokenIndices.length}`);
                    }

                    if (actualView[i].tokenIndices.length > 0) {
                        actualView[i].tokenIndices.forEach((ti, tiIndex) => {
                            if (t.tokenIndices.length <= tiIndex) {
                                failureMessages.push(`TokenIndices[${tiIndex}] exists but was not expected`);
                            } else if (ti !== t.tokenIndices[tiIndex]) {
                                failureMessages.push(`TokenIndex #${tiIndex} mismatch: Expected = ${t.tokenIndices[tiIndex]}, Actual = ${ti}`);
                            }
                        })
                    }
                } else {
                    failureMessages.push(`Argument missing: Expected arguments[${i}] to exist, but it was not found in Actual`);
                }
            })
        }

        if (actualView.length > 0) {
            actualView.forEach((t, i) => {
                if (expectedView.length > i) {
                    if (expectedView[i].assumedArgKind !== t.assumedArgKind) {
                        failureMessages.push(`assumedArgKind mismatch: Expected = ${expectedView[i].assumedArgKind}, Actual = ${t.assumedArgKind}`);
                    }

                    if (expectedView[i].tokenIndices.length !== t.tokenIndices.length) {
                        failureMessages.push(`tokenIndices array length mismatch: Expected = ${expectedView[i].tokenIndices.length}, Actual = ${t.tokenIndices.length}`);
                    }

                    if (expectedView[i].tokenIndices.length > 0) {
                        expectedView[i].tokenIndices.forEach((ti, tiIndex) => {
                            if (t.tokenIndices.length <= tiIndex) {
                                failureMessages.push(`TokenIndices[${tiIndex}] was expected but does not exist`);
                            } else if (ti !== t.tokenIndices[tiIndex]) {
                                failureMessages.push(`TokenIndex #${tiIndex} mismatch: Expected = ${ti}, Actual = ${t.tokenIndices[tiIndex]}`);
                            }
                        })
                    }
                } else {
                    failureMessages.push(`Missing Argument: arguments[${i}] was expected but does not exist`);
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
}