// import { Token } from './token';
// import { ViewTestResult, ViewTest, ViewTestHelper } from '../common/view-test';
// import { OriginView } from './origin-view';
// import { OriginViewParser } from './origin-view-parser';

// export class OriginViewTester {
//     public static single(json: string): ViewTestResult {
//         try {
//             const test = ViewTestHelper.parseTestDefinition(
//                 json,
//                 (j) => {
//                     return JSON.parse(j).expectedView as OriginView;
//                 },
//                 (j) => {
//                     return ViewTestHelper.parseInput(JSON.parse(j).input);
//                 });
//             // const test = JSON.parse(json) as ViewTest<string, OriginView>;
//             // const testInput = ViewTestHelper.parseInput(test.input);
//             const output = OriginViewParser.parse(test.input);
//             const viewFailures = OriginViewTester.findViewFailures(test.expectedView, output.parsedView);
//             const messageFailures = ViewTestHelper.findMessageFailures(test.expectedMessages, output.messages);

//             return {
//                 passed: viewFailures.length === 0 && messageFailures.length === 0,
//                 failures: viewFailures.concat(messageFailures),
//                 testDescription: test.testDescription
//             }
//         } catch (err) {
//             return {
//                 passed: false,
//                 failures: [ViewTestHelper.getUnexpectedFailureString(err)],
//                 testDescription: ViewTestHelper.tryGetTestDescription(json)
//             }
//         }
//     }

//     public static list(json: string): Array<ViewTestResult> {
//         const testJsonObjects = JSON.parse(json) as any[];
//         return testJsonObjects.map(o => OriginViewTester.single(JSON.stringify(o)));
//     }

//     private static findViewFailures(expectedView: OriginView, actualView: OriginView): Array<string> {
//         const failureMessages = new Array<string>();
//         if (expectedView.tokens.length !== actualView.tokens.length) {
//             failureMessages.push('Tokens array length mismatch');
//         }

//         if (expectedView.tokens.length > 0) {
//             expectedView.tokens.forEach((t, i) => {
//                 if (actualView.tokens.length > i) {
//                     if (actualView.tokens[i].index !== t.index) {
//                         failureMessages.push(`Token index mismatch: Expected = ${t.index}, Actual = ${actualView.tokens[i].index}`);
//                     }

//                     if (actualView.tokens[i].startPosition !== t.startPosition) {
//                         failureMessages.push(`Token startPosition mismatch: Expected = ${t.startPosition}, Actual = ${actualView.tokens[i].startPosition}`);
//                     }

//                     if (actualView.tokens[i].endPosition !== t.endPosition) {
//                         failureMessages.push(`Token endPosition mismatch: Expected = ${t.endPosition}, Actual = ${actualView.tokens[i].endPosition}`);
//                     }

//                     if (actualView.tokens[i].length !== t.length) {
//                         failureMessages.push(`Token length mismatch: Expected = ${t.length}, Actual = ${actualView.tokens[i].length}`);
//                     }

//                     if (actualView.tokens[i].text !== t.text) {
//                         failureMessages.push(`Token text mismatch: Expected = ${t.text}, Actual = ${actualView.tokens[i].text}`);
//                     }
//                 } else {
//                     failureMessages.push(`Token missing: Expected tokens[${t.index}] to exist, but it was not found in Actual`);
//                 }
//             })
//         }

//         if (actualView.tokens.length > 0) {
//             actualView.tokens.forEach((t, i) => {
//                 if (expectedView.tokens.length > i) {
//                     if (expectedView.tokens[i].index !== t.index) {
//                         failureMessages.push(`Token index mismatch: Expected = ${expectedView.tokens[i].index}, Actual = ${t.index}`);
//                     }

//                     if (expectedView.tokens[i].startPosition !== t.startPosition) {
//                         failureMessages.push(`Token startPosition mismatch: Expected = ${expectedView.tokens[i].startPosition}, Actual = ${t.startPosition}`);
//                     }

//                     if (expectedView.tokens[i].endPosition !== t.endPosition) {
//                         failureMessages.push(`Token endPosition mismatch: Expected = ${expectedView.tokens[i].endPosition}, Actual = ${t.endPosition}`);
//                     }

//                     if (expectedView.tokens[i].length !== t.length) {
//                         failureMessages.push(`Token length mismatch: Expected = ${expectedView.tokens[i].length}, Actual = ${t.length}`);
//                     }

//                     if (expectedView.tokens[i].text !== t.text) {
//                         failureMessages.push(`Token text mismatch: Expected = ${expectedView.tokens[i].text}, Actual = ${t.text}`);
//                     }
//                 } else {
//                     failureMessages.push(`Token missing: Unexpected Tokens[${t.index}] exists`);
//                 }
//             })
//         }

//         if (failureMessages.length > 0) {
//             const distinctMessages = new Array<string>();
//             failureMessages.forEach(m => {
//                 if (!distinctMessages.includes(m)) {
//                     distinctMessages.push(m);
//                 }
//             })
//             return distinctMessages;
//         } else {
//             return [];
//         }
//     }
// }