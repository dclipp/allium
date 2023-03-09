const fs = require('fs');

function generateDefinition(parsedObj, currentKey, depth) {
    const keys = Object.keys(parsedObj);
    const tabs = '\t'.repeat(depth);
    if (keys.includes('code')) {
        return `${tabs}readonly ${currentKey}: AsmMessageTemplate`;
    } else {
        const inner = keys.map(k => generateDefinition(parsedObj[k], k, depth + 1)).reduce((x, y) => !!x ? `${x},\n${y}` : y, '');
        return `${tabs}readonly ${currentKey}: {\n${inner}\n${tabs}},`.replace(/,,/g, ',');
    }
}

function generateTypeDefinitions(parsedObj) {
    let definitionSourceCode = '{\n';
    Object.keys(parsedObj).forEach((k, i, a) => {
        definitionSourceCode += generateDefinition(parsedObj[k], k, 2);
        if (i === a.length - 1) {
            definitionSourceCode = definitionSourceCode.substring(0, definitionSourceCode.length - 1);
        }
        definitionSourceCode += '\n';
    });
    definitionSourceCode += '\n}';
    return definitionSourceCode;
}

function generateValueAssignment(parsedObj, currentKey, depth) {
    const keys = Object.keys(parsedObj);
    const tabs = '\t'.repeat(depth);
    if (keys.includes('code')) {
        const hasCoordinatesText = `\n${tabs}\thasCoordinates: ${parsedObj.hasCoordinates},`;
        const codeText = `\n${tabs}\tcode: ${parsedObj.code},`;
        const classificationText = `\n${tabs}\tclassification: AsmMessageClassification.${parsedObj.classification}`;
        const masterCodeText = parsedObj.masterCode === undefined
            ? ''
            : `,\n${tabs}\tmasterCode: ${parsedObj.masterCode}`;
        const endText = `\n${tabs}}`;
        return `${tabs}${currentKey}: {${hasCoordinatesText}${codeText}${classificationText}${masterCodeText}${endText}`;
    } else {
        const inner = keys.map(k => generateValueAssignment(parsedObj[k], k, depth + 1)).reduce((x, y) => !!x ? `${x},\n${y}` : y, '');
        return `${tabs}${currentKey}: {\n${inner}\n${tabs}},`.replace(/,,/g, ',');
    }
}

function generateValues(parsedObj) {
    let definitionSourceCode = '{\n';
    Object.keys(parsedObj).forEach((k, i, a) => {
        definitionSourceCode += generateValueAssignment(parsedObj[k], k, 2);
        if (i === a.length - 1) {
            definitionSourceCode = definitionSourceCode.substring(0, definitionSourceCode.length - 1);
        }
        definitionSourceCode += '\n';
    });
    definitionSourceCode += '\n\t}';
    return definitionSourceCode;
}

function generateObjectSource(parsedObj, objectName) {
    const typeDefs = generateTypeDefinitions(parsedObj);
    const values = generateValues(parsedObj);

    return `\tpublic static readonly ${objectName}: ${typeDefs} = ${values}\n`;
}

function direntToString(o) {
    if (!!o.name) {
        return o.name;
    } else {
        return o;
    }
}

function generateAll() {
    const files = fs.readdirSync('resources/message-templates', {
        withFileTypes: true
    }).map(f => direntToString(f)).filter(f => f.toLowerCase().endsWith('.json'));

    return files.map(f => {
        const nameSegments = f.split('.')[0].split('-').filter((x, y, z) => y < z.length - 1);
        const objectName = nameSegments.map(ns => ns.charAt(0).toUpperCase() + ns.substring(1)).reduce((x, y) => x + y, '');
        const currentJson = fs.readFileSync(`resources/message-templates/${f}`);
        const currentObject = JSON.parse(currentJson);

        return generateObjectSource(currentObject, objectName);
    }).reduce((x, y) => x + y, '');
}

function generateFile() {
    const importText = 'import { AsmMessageClassification } from \'./asm-message-classification\'\n'
        + 'import { AsmMessageTemplate } from \'./asm-message-template\'\n';
    return `${importText}\nexport class ASM_MESSAGES {\n${generateAll()}\n}`;
}

fs.writeFileSync('src/messages/asm-messages.ts', generateFile());