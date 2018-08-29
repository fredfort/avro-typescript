#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

const PRIMITIVE_TYPES = ['string', 'boolean', 'long', 'int', 'double', 'float', 'bytes', 'null'];
function isRecordType(type) {
    return type.type === 'record';
}
function isArrayType(type) {
    return type.type === 'array';
}
function isMapType(type) {
    return type.type === 'map';
}
function isEnumType(type) {
    return type.type === 'enum';
}
function isUnion(type) {
    return type instanceof Array;
}
function isPrimitive(type) {
    return PRIMITIVE_TYPES.indexOf(type) >= 0;
}
function isOptional(type) {
    if (isUnion(type)) {
        const t1 = type[0];
        if (typeof t1 === 'string') {
            return t1 === 'null';
        }
    }
}

/*Global variable */
let options = {
    convertEnumToType: false,
    removeNameSpace: false,
};
/** Converts an Avro record type to a TypeScript file */
function avroToTypeScript(recordType, userOptions) {
    const output = [];
    options = Object.assign({}, options, userOptions);
    convertRecord(recordType, output);
    return output.join('\n');
}
/** Convert an Avro Record type. Return the name, but add the definition to the file */
function convertRecord(recordType, fileBuffer) {
    let buffer = `export interface ${removeNameSpace(recordType.name)} {\n`;
    for (const field of recordType.fields) {
        buffer += convertFieldDec(field, fileBuffer) + '\n';
    }
    buffer += '}\n';
    fileBuffer.push(buffer);
    return recordType.name;
}
/** Convert an Avro Enum type. Return the name, but add the definition to the file */
function convertEnum(enumType, fileBuffer) {
    const enumDef = `export enum ${enumType.name} { ${enumType.symbols
        .join(', ')} }\n`;
    fileBuffer.push(enumDef);
    return enumType.name;
}
/** Convert an Avro string litteral type. Return the name, but add the definition to the file */
function convertEnumToType(enumType, fileBuffer) {
    const enumDef = `export type ${enumType.name}  =  ${enumType.symbols
        .map((symbol) => `'${symbol}'`)
        .join(' | ')}\n`;
    fileBuffer.push(enumDef);
    return enumType.name;
}
function convertType(type, buffer) {
    // if it's just a name, then use that
    if (typeof type === 'string') {
        return convertPrimitive(type) || removeNameSpace(type);
    }
    else if (type instanceof Array) {
        // array means a Union. Use the names and call recursively
        return type.map((t) => removeNameSpace(convertType(t, buffer))).join(' | ');
    }
    else if (isRecordType(type)) {
        // } type)) {
        // record, use the name and add to the buffer
        return convertRecord(type, buffer);
    }
    else if (isArrayType(type)) {
        // array, call recursively for the array element type
        if ([].concat(type.items).length === 1) {
            return `${convertType(type.items, buffer)}[]`;
        }
        return `(${convertType(type.items, buffer)})[]`;
    }
    else if (isMapType(type)) {
        // Dictionary of types, string as key
        return `{ [index:string]:${convertType(type.values, buffer)} }`;
    }
    else if (isEnumType(type)) {
        // array, call recursively for the array element type
        return options.convertEnumToType
            ? convertEnumToType(type, buffer)
            : convertEnum(type, buffer);
    }
    else {
        console.error('Cannot work out type', type);
        return 'UNKNOWN';
    }
}
/** Convert a primitive type from avro to TypeScript */
function convertPrimitive(avroType) {
    switch (avroType) {
        case 'long':
        case 'int':
        case 'double':
        case 'float':
            return 'number';
        case 'bytes':
            return 'Buffer';
        case 'null':
            return 'null | undefined';
        case 'boolean':
            return 'boolean';
        default:
            return null;
    }
}
function removeNameSpace(value) {
    return !options.removeNameSpace || value.indexOf('.') === -1
        ? value
        : value.split('.')[value.split('.').length - 1];
}
function convertFieldDec(field, buffer) {
    // Union Type
    return `\t${field.name}${isOptional(field.type) ? '?' : ''}: ${convertType(field.type, buffer)}`;
}

function generateEnumType(type) {
    return `export type ${type.name} = ${type.symbols.map((symbol) => `'${symbol}'`).join(' | ')}`;
}

function interfaceName(type) {
    return `I${type.name}`;
}
function className(type) {
    return type.name;
}
function qualifiedName(type) {
    return type.namespace ? `${type.namespace}.${type.name}` : type.name;
}
function resolveReference(ref, fqns, mapping) {
    const fqn = fqns.get(ref);
    return mapping.get(fqn);
}
function asSelfExecuting(code) {
    return `(() => {
    ${code}
  })()`;
}
function joinConditional(branches, elseBranch) {
    if (branches.length === 0) {
        return '';
    }
    const [[firstCond, firstBranch], ...restOfBranches] = branches;
    return `if(${firstCond}){\n${firstBranch}\n}
  ${restOfBranches.map(([cond, branch]) => `else if(${cond}){\n${branch}\n}`).join('\n')}
  ${elseBranch ? `else {\n${elseBranch}\n}` : ''}`;
}
function getTypeName(type, fqns) {
    if (isPrimitive(type)) {
        return type;
    }
    else if (isArrayType(type) || isMapType(type)) {
        return type.type;
    }
    else if (isRecordType(type) || isEnumType(type)) {
        return qualifiedName(type);
    }
    else if (typeof type === 'string') {
        return fqns.get(type);
    }
}

function generatePrimitive(avroType) {
    switch (avroType) {
        case 'long':
        case 'int':
        case 'double':
        case 'float':
            return 'number';
        case 'bytes':
            return 'Buffer';
        case 'null':
            return 'null';
        case 'boolean':
            return 'boolean';
        case 'string':
            return 'string';
        default:
            throw new TypeError(`Unknown primitive type: ${avroType}`);
    }
}
function generateFieldType(type, fqns, mapping) {
    if (isPrimitive(type)) {
        return generatePrimitive(type);
    }
    else if (typeof type === 'string') {
        return generateFieldType(resolveReference(type, fqns, mapping), fqns, mapping);
    }
    else if (type instanceof Array) {
        return type.map((tpe) => generateFieldType(tpe, fqns, mapping)).join(' | ');
    }
    else if (isRecordType(type)) {
        return interfaceName(type);
    }
    else if (isEnumType(type)) {
        return type.name;
    }
    else if (isArrayType(type)) {
        if ([].concat(type.items).length === 1) {
            return `${generateFieldType(type.items, fqns, mapping)}[]`;
        }
        return `(${generateFieldType(type.items, fqns, mapping)})[]`;
    }
    else if (isMapType(type)) {
        return `{ [index:string]:${generateFieldType(type.values, fqns, mapping)} }`;
    }
    throw new TypeError(`Unknown type ${type}!`);
}

function getKey(t, fqns, mapping) {
    if (!isPrimitive(t) && typeof t === 'string') {
        return getKey(resolveReference(t, fqns, mapping), fqns, mapping);
    }
    else if (isRecordType(t)) {
        return `${className(t)}.FQN`;
    }
    else if (isEnumType(t)) {
        return `'${qualifiedName(t)}'`;
    }
    else {
        return `'${getTypeName(t, fqns)}'`;
    }
}
function generateAssignmentValue(type, fqns, mapping, inputVar) {
    if ((typeof type === 'string' && isPrimitive(type)) || isEnumType(type)) {
        return `${inputVar}`;
    }
    else if (isRecordType(type)) {
        return `${className(type)}.deserialize(${inputVar})`;
    }
    else if (typeof type === 'string') {
        return generateAssignmentValue(resolveReference(type, fqns, mapping), fqns, mapping, inputVar);
    }
    else if (isArrayType(type)) {
        if (isUnion(type.items) && type.items.length > 1) {
            return `${inputVar}.map((e) => {
        return ${generateAssignmentValue(type.items, fqns, mapping, 'e')}
      })`;
        }
        return `${inputVar}.map((e) => ${generateAssignmentValue(type.items, fqns, mapping, 'e')})`;
    }
    else if (isUnion(type)) {
        if (type.length === 1) {
            return generateAssignmentValue(type[0], fqns, mapping, inputVar);
        }
        const nonNullTypes = type.filter((t) => t !== 'null');
        const hasNull = nonNullTypes.length !== type.length;
        let conditions = null;
        let branches = null;
        conditions = nonNullTypes.map((t) => `${inputVar}[${getKey(t, fqns, mapping)}] !== undefined`);
        branches = nonNullTypes.map((t) => `return ${generateAssignmentValue(t, fqns, mapping, `${inputVar}[${getKey(t, fqns, mapping)}]`)}`);
        if (hasNull) {
            conditions = [`${inputVar} === null`].concat(conditions);
            branches = [`return null`].concat(branches);
        }
        const elseBranch = `throw new TypeError('Unresolvable type');`;
        const branchesAsTuples = conditions.map((c, i) => [c, branches[i]]);
        const ifElseStatement = joinConditional(branchesAsTuples, elseBranch);
        return asSelfExecuting(ifElseStatement);
    }
    else if (isMapType(type)) {
        const mapParsingStatements = `const keys = Object.keys(${inputVar});
    const output: ${generateFieldType(type, fqns, mapping)} = {};
    for(let i = 0; i < keys.length; i +=1 ) {
      const mapKey = keys[i];
      const mapValue = ${inputVar}[mapKey];
      output[mapKey] = ${generateAssignmentValue(type.values, fqns, mapping, 'mapValue')};
    }
    return output;`;
        return asSelfExecuting(mapParsingStatements);
    }
    return 'null';
}
function generateDeserializeFieldAssignment(field, fqns, mapping) {
    return `${field.name}: ${generateAssignmentValue(field.type, fqns, mapping, `input.${field.name}`)},`;
}
function generateDeserialize(type, fqns, mapping) {
    return `public static deserialize(input: any): ${className(type)} {
    return new ${className(type)}({
      ${type.fields.map((f) => generateDeserializeFieldAssignment(f, fqns, mapping)).join('\n')}
    })
  }`;
}

function getKey$1(t, fqns, mapping) {
    if (!isPrimitive(t) && typeof t === 'string') {
        return getKey$1(resolveReference(t, fqns, mapping), fqns, mapping);
    }
    else if (isRecordType(t)) {
        return `[${className(t)}.FQN]`;
    }
    else if (isEnumType(t)) {
        return `'${qualifiedName(t)}'`;
    }
    else {
        return `'${getTypeName(t, fqns)}'`;
    }
}
function generateCondition(type, fqns, mapping, inputVar) {
    if (isPrimitive(type)) {
        switch (type) {
            case 'string':
                return `typeof ${inputVar} === 'string'`;
            case 'boolean':
                return `typeof ${inputVar} === 'boolean'`;
            case 'int':
            case 'long':
                return `typeof ${inputVar} === 'number' && ${inputVar} % 1 === 0`;
            case 'float':
            case 'double':
                return `typeof ${inputVar} === 'number' && ${inputVar} % 1 !== 0`;
            /* case 'bytes':
              return `typeof ${inputVar} === Buffer` */
        }
    }
    else if (isArrayType(type)) {
        return `Array.isArray(${inputVar})`;
    }
    else if (isRecordType(type)) {
        return `${inputVar} instanceof ${className(type)}`;
    }
    else if (isEnumType(type)) {
        return `typeof ${inputVar} === 'string' && [${type.symbols
            .map((s) => `'${s}'`)
            .join(',')}].indexOf(${inputVar}) >= 0`;
    }
    else if (isMapType(type)) {
        return `typeof ${inputVar} === 'object'`; // TODO
    }
    else if (typeof type === 'string') {
        return generateCondition(resolveReference(type, fqns, mapping), fqns, mapping, inputVar);
    }
    throw new TypeError(`Unknown type ${JSON.stringify(type)}`);
}
function generateUnionWrapper(type, fqns, mapping, inputVar) {
    if (isPrimitive(type) || isArrayType(type) || isMapType(type) || isEnumType(type) || isRecordType(type)) {
        return `return { ${getKey$1(type, fqns, mapping)}: ${generateAssignmentValue$1(type, fqns, mapping, inputVar)} }`;
    }
    else if (typeof type === 'string') {
        return generateUnionWrapper(resolveReference(type, fqns, mapping), fqns, mapping, inputVar);
    }
    else {
        throw new TypeError(`Unknown type ${type}`);
    }
}
function generateAssignmentValue$1(type, fqns, mapping, inputVar) {
    if (isPrimitive(type) || isEnumType(type)) {
        return inputVar;
    }
    else if (isRecordType(type)) {
        return `${className(type)}.serialize(${inputVar})`;
    }
    else if (isArrayType(type)) {
        if (isUnion(type.items) && type.items.length > 1) {
            return `${inputVar}.map((e) => {
        return ${generateAssignmentValue$1(type.items, fqns, mapping, 'e')}
      })`;
        }
        return `${inputVar}.map((e) => ${generateAssignmentValue$1(type.items, fqns, mapping, 'e')})`;
    }
    else if (isUnion(type)) {
        if (type.length === 1) {
            return generateAssignmentValue$1(type[0], fqns, mapping, inputVar);
        }
        const hasNull = type.indexOf('null') >= 0;
        const withoutNull = type.filter((t) => t !== 'null');
        let conditions = withoutNull.map((t) => generateCondition(t, fqns, mapping, inputVar));
        let values = withoutNull.map((t) => generateUnionWrapper(t, fqns, mapping, inputVar));
        if (hasNull) {
            conditions = [`${inputVar} === null`].concat(conditions);
            values = [`return null`].concat(values);
        }
        let branches = conditions.map((c, i) => [c, values[i]]);
        const elseBranch = `throw new TypeError('Unserializable type!')`;
        return asSelfExecuting(joinConditional(branches, elseBranch));
    }
    else if (isMapType(type)) {
        const mapParsingStatements = `const keys = Object.keys(${inputVar});
    const output: any = {};
    for(let i = 0; i < keys.length; i +=1 ) {
      const mapKey = keys[i];
      const mapValue = ${inputVar}[mapKey];
      output[mapKey] = ${generateAssignmentValue$1(type.values, fqns, mapping, 'mapValue')};
    }
    return output;`;
        return asSelfExecuting(mapParsingStatements);
    }
    else if (typeof type === 'string') {
        return generateAssignmentValue$1(resolveReference(type, fqns, mapping), fqns, mapping, inputVar);
    }
    else {
        throw new TypeError(`not ready for type ${type}`);
    }
}
function generateFieldAssginment(field, fqns, mapping) {
    return `${field.name}: ${generateAssignmentValue$1(field.type, fqns, mapping, `input.${field.name}`)}`;
}
function generateSerialize(type, fqns, mapping) {
    const name = type.name;
    return `public static serialize(input: ${name}): object {
    return {
      ${type.fields.map((field) => generateFieldAssginment(field, fqns, mapping))}
    }
  }`;
}

function generateClassFieldDeclaration(field, fqns, mapping) {
    return `public readonly ${field.name}: ${generateFieldType(field.type, fqns, mapping)}`;
}
function generateClass(type, fqns, mapping) {
    const assignments = type.fields.length === 0
        ? '/* noop */'
        : type.fields.map((field) => `this.${field.name} = input.${field.name};`).join('\n');
    return `export class ${className(type)} implements ${interfaceName(type)} {
    public static FQN = '${qualifiedName(type)}'
    ${type.fields.map((f) => generateClassFieldDeclaration(f, fqns, mapping)).join('\n')}
    constructor(input: Partial<${interfaceName(type)}>) {
      ${assignments}
    }
    ${generateDeserialize(type, fqns, mapping)}
    ${generateSerialize(type, fqns, mapping)}
  }`;
}

function generateFieldDeclaration(field, fqns, mapping) {
    return `${field.name}: ${generateFieldType(field.type, fqns, mapping)}`;
}
function generateInterface(type, fqns, mapping) {
    return `export interface ${interfaceName(type)} {
    ${type.fields.map((field) => generateFieldDeclaration(field, fqns, mapping)).join('\n')}
  }`;
}

class FqnResolver {
    constructor() {
        this.fqns = new Set();
    }
    add(namespace, name) {
        this.fqns.add(`${namespace}.${name}`);
    }
    get(name) {
        if (this.fqns.has(name)) {
            return name;
        }
        const arr = Array.from(this.fqns);
        const matching = arr.filter((fqn) => {
            const segments = fqn.split('.');
            return segments[segments.length - 1] === name;
        });
        switch (matching.length) {
            case 0:
                return null;
            case 1:
                return matching[0];
            default:
                throw new TypeError(`Multiple matching fqns for ${name}: ${matching.join(', ')}`);
        }
    }
}

function augmentRecordsAndEnums(type, namespace, fqns) {
    if (isUnion(type)) {
        type.forEach((tp) => augmentRecordsAndEnums(tp, namespace, fqns));
    }
    else if (isEnumType(type)) {
        type.namespace = type.namespace || namespace;
        fqns.add(type.namespace, type.name);
    }
    else if (isRecordType(type)) {
        type.namespace = type.namespace || namespace;
        fqns.add(type.namespace, type.name);
        type.fields.forEach((field) => augmentRecordsAndEnums(field.type, type.namespace, fqns));
    }
    else if (isArrayType(type)) {
        augmentRecordsAndEnums(type.items, namespace, fqns);
    }
    else if (isMapType(type)) {
        augmentRecordsAndEnums(type.values, namespace, fqns);
    }
}
function augmentReferences(type, fqns) {
    if (isUnion(type)) {
        type.forEach((optionType, i) => {
            if (typeof optionType === 'string' && !isPrimitive(optionType)) {
                type[i] = fqns.get(optionType);
            }
            else {
                augmentReferences(optionType, fqns);
            }
        });
    }
    else if (isRecordType(type)) {
        type.fields.forEach((field) => {
            const ft = field.type;
            if (typeof ft === 'string' && !isPrimitive(ft)) {
                field.type = fqns.get(ft);
            }
        });
    }
    else if (isArrayType(type)) {
        augmentReferences(type.items, fqns);
    }
    else if (isMapType(type)) {
        augmentReferences(type.values, fqns);
    }
}
function addNamespaces(type, fqns) {
    const cloned = JSON.parse(JSON.stringify(type));
    augmentRecordsAndEnums(cloned, null, fqns);
    augmentReferences(cloned, fqns);
    return cloned;
}

function getNameToTypeMapping(types) {
    return new Map(types.map((type) => [qualifiedName(type), type]));
}
function alphaComparator(a, b) {
    if (a.name < b.name) {
        return -1;
    }
    else if (a.name > b.name) {
        return 1;
    }
    return 0;
}
function getAllRecordTypes(type, types) {
    if (isRecordType(type)) {
        types.push(type);
        type.fields.forEach((field) => getAllRecordTypes(field.type, types));
    }
    else if (isUnion(type)) {
        type.forEach((optionType) => getAllRecordTypes(optionType, types));
    }
    else if (isArrayType(type)) {
        getAllRecordTypes(type.items, types);
    }
    else if (isMapType(type)) {
        getAllRecordTypes(type.values, types);
    }
    return types;
}
function getAllEnumTypes(type, types) {
    if (isEnumType(type)) {
        types.push(type);
    }
    else if (isUnion(type)) {
        type.forEach((optionType) => getAllEnumTypes(optionType, types));
    }
    else if (isRecordType(type)) {
        type.fields.forEach((field) => getAllEnumTypes(field.type, types));
    }
    else if (isArrayType(type)) {
        getAllEnumTypes(type.items, types);
    }
    else if (isMapType(type)) {
        getAllEnumTypes(type.values, types);
    }
    return types;
}
function generateAll(record) {
    const fqns = new FqnResolver();
    const type = addNamespaces(record, fqns);
    const enumTypes = getAllEnumTypes(type, []).sort(alphaComparator);
    const recordTypes = getAllRecordTypes(type, []).sort(alphaComparator);
    const mapping = getNameToTypeMapping([].concat(enumTypes, recordTypes));
    const enums = enumTypes.map(generateEnumType);
    const interfaces = recordTypes.map((t) => generateInterface(t, fqns, mapping));
    const classes = recordTypes.map((t) => generateClass(t, fqns, mapping));
    return []
        .concat(enums)
        .concat(interfaces)
        .concat(classes)
        .join('\n');
}

const minimist = require('minimist');
function collectFiles(filePath, accumulated) {
    if (!fs.existsSync(filePath)) {
        throw new TypeError(`Path "${filePath}" doesn't exist!`);
    }
    const stats = fs.lstatSync(filePath);
    if (stats.isDirectory()) {
        const content = fs.readdirSync(filePath);
        content.map((childPath) => collectFiles(path.join(filePath, childPath), accumulated));
    }
    else if (path.extname(filePath) === '.avsc') {
        accumulated.push(filePath);
    }
    return accumulated;
}
function collectAllFiles({ file }) {
    if (file === undefined) {
        throw new TypeError('Argument --file or -f should be provided!');
    }
    const inputFiles = Array.isArray(file) ? file : [file];
    const rawFiles = inputFiles.map((f) => path.resolve(f));
    const allFiles = [];
    rawFiles.forEach((rawFile) => collectFiles(rawFile, allFiles));
    return allFiles;
}
function generateContent(schema, args) {
    if (Boolean(args.customMode)) {
        return generateAll(schema);
    }
    else {
        return avroToTypeScript(schema, {
            convertEnumToType: Boolean(args.convertEnumToType),
            removeNameSpace: Boolean(args.removeNameSpace),
        });
    }
}
function convertAndSendToStdout(files, args) {
    files.forEach((f) => {
        const content = fs.readFileSync(f, 'UTF8');
        const schema = JSON.parse(content);
        const tsContent = generateContent(schema, args);
        process.stdout.write(`// Generated from ${path.basename(f)}\n\n${tsContent}\n`);
    });
}
const [, , ...valuableArgs] = process.argv;
const parsedArgs = minimist(valuableArgs, {
    alias: { f: 'file', c: 'convertEnumToType', r: 'removeNameSpace', x: 'customMode' },
    string: ['files'],
    boolean: ['convertEnumToType', 'removeNameSpace'],
});
const allRelevantFiles = collectAllFiles(parsedArgs);
convertAndSendToStdout(allRelevantFiles, parsedArgs);
