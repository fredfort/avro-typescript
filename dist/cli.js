#!/usr/bin/env node
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = require('fs');
var path = require('path');
var prettier = _interopDefault(require('prettier'));

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

function augmentRecordsAndEnums(type, namespace, context) {
    if (isUnion(type)) {
        type.forEach((tp) => augmentRecordsAndEnums(tp, namespace, context));
    }
    else if (isEnumType(type)) {
        type.namespace = type.namespace || namespace;
        context.fqnResolver.add(type.namespace, type.name);
    }
    else if (isRecordType(type)) {
        type.namespace = type.namespace || namespace;
        context.fqnResolver.add(type.namespace, type.name);
        type.fields.forEach((field) => augmentRecordsAndEnums(field.type, type.namespace, context));
    }
    else if (isArrayType(type)) {
        augmentRecordsAndEnums(type.items, namespace, context);
    }
    else if (isMapType(type)) {
        augmentRecordsAndEnums(type.values, namespace, context);
    }
}
function augmentReferences(type, context) {
    if (isUnion(type)) {
        type.forEach((optionType, i) => {
            if (typeof optionType === 'string' && !isPrimitive(optionType)) {
                type[i] = context.fqnResolver.get(optionType);
            }
            else {
                augmentReferences(optionType, context);
            }
        });
    }
    else if (isRecordType(type)) {
        type.fields.forEach((field) => {
            const ft = field.type;
            if (typeof ft === 'string' && !isPrimitive(ft)) {
                field.type = context.fqnResolver.get(ft);
            }
        });
    }
    else if (isArrayType(type)) {
        augmentReferences(type.items, context);
    }
    else if (isMapType(type)) {
        augmentReferences(type.values, context);
    }
}
function addNamespaces(type, context) {
    const cloned = JSON.parse(JSON.stringify(type));
    augmentRecordsAndEnums(cloned, null, context);
    augmentReferences(cloned, context);
    return cloned;
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
function interfaceName(type) {
    return `I${type.name}`;
}
function avroWrapperName(type) {
    return `I${type.name}AvroWrapper`;
}
function className(type) {
    return type.name;
}
function enumName(type) {
    return type.name;
}
function qualifiedNameFor(type, transform, context) {
    if (context.options.removeNameSpace) {
        return transform(type);
    }
    return qualifiedName(type, transform);
}
function qInterfaceName(type, context) {
    return qualifiedNameFor(type, interfaceName, context);
}
function qClassName(type, context) {
    return qualifiedNameFor(type, className, context);
}
function qEnumName(type, context) {
    return qualifiedNameFor(type, enumName, context);
}
function qAvroWrapperName(type, context) {
    return qualifiedNameFor(type, avroWrapperName, context);
}
function qualifiedName(type, transform = (e) => e.name) {
    return type.namespace ? `${type.namespace}.${transform(type)}` : transform(type);
}
function resolveReference(ref, context) {
    const fqn = context.fqnResolver.get(ref);
    return context.nameToTypeMapping.get(fqn);
}
function asSelfExecuting(code) {
    return `(() => {
    ${code}
  })()`;
}
function joinConditional(branches) {
    if (branches.length === 0) {
        return '';
    }
    const [[firstCond, firstBranch], ...restOfBranches] = branches;
    return `if(${firstCond}){\n${firstBranch}\n}
  ${restOfBranches.map(([cond, branch]) => `else if(${cond}){\n${branch}\n}`).join('\n')}`;
}
function getTypeName(type, context) {
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
        return context.fqnResolver.get(type);
    }
}
function groupByNamespace(types) {
    const mapping = new Map();
    types.forEach((type) => {
        if (!Array.isArray(mapping.get(type.namespace))) {
            mapping.set(type.namespace, []);
        }
        const array = mapping.get(type.namespace);
        array.push(type);
    });
    return mapping;
}
function collectNamespaces(types) {
    const ns = new Set();
    types.forEach(({ namespace }) => ns.add(namespace));
    return ns;
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
function generateFieldType(type, context) {
    if (isPrimitive(type)) {
        return generatePrimitive(type);
    }
    else if (typeof type === 'string') {
        return generateFieldType(resolveReference(type, context), context);
    }
    else if (type instanceof Array) {
        return type.map((tpe) => generateFieldType(tpe, context)).join(' | ');
    }
    else if (isRecordType(type)) {
        return qInterfaceName(type, context);
    }
    else if (isEnumType(type)) {
        return qEnumName(type, context);
    }
    else if (isArrayType(type)) {
        if ([].concat(type.items).length === 1) {
            return `${generateFieldType(type.items, context)}[]`;
        }
        return `(${generateFieldType(type.items, context)})[]`;
    }
    else if (isMapType(type)) {
        return `{ [index:string]:${generateFieldType(type.values, context)} }`;
    }
    throw new TypeError(`Unknown type ${type}!`);
}

function generateFieldDeclaration(field, context) {
    return `${field.name}: ${generateFieldType(field.type, context)}`;
}
function generateInterface(type, context) {
    return `export interface ${interfaceName(type)} {
    ${type.fields.map((field) => generateFieldDeclaration(field, context)).join('\n')}
  }`;
}

function getKey(t, context) {
    if (!isPrimitive(t) && typeof t === 'string') {
        return getKey(resolveReference(t, context), context);
    }
    else if (isEnumType(t) || isRecordType(t)) {
        return `'${qualifiedName(t)}'`;
    }
    else {
        return `'${getTypeName(t, context)}'`;
    }
}
function generateAssignmentValue(type, context, inputVar) {
    if ((typeof type === 'string' && isPrimitive(type)) || isEnumType(type)) {
        return `${inputVar}`;
    }
    else if (isRecordType(type)) {
        return `${qClassName(type, context)}.deserialize(${inputVar})`;
    }
    else if (typeof type === 'string') {
        return generateAssignmentValue(resolveReference(type, context), context, inputVar);
    }
    else if (isArrayType(type)) {
        if (isUnion(type.items) && type.items.length > 1) {
            return `${inputVar}.map((e) => {
        return ${generateAssignmentValue(type.items, context, 'e')}
      })`;
        }
        return `${inputVar}.map((e) => ${generateAssignmentValue(type.items, context, 'e')})`;
    }
    else if (isUnion(type)) {
        if (type.length === 1) {
            return generateAssignmentValue(type[0], context, inputVar);
        }
        const nonNullTypes = type.filter((t) => t !== 'null');
        const hasNull = nonNullTypes.length !== type.length;
        let conditions = null;
        let branches = null;
        conditions = nonNullTypes.map((t) => `${inputVar}[${getKey(t, context)}] !== undefined`);
        branches = nonNullTypes.map((t) => `return ${generateAssignmentValue(t, context, `${inputVar}[${getKey(t, context)}]`)}`);
        if (hasNull) {
            conditions = [`${inputVar} === null`].concat(conditions);
            branches = [`return null`].concat(branches);
        }
        const branchesAsTuples = conditions.map((c, i) => [c, branches[i]]);
        const block = `${joinConditional(branchesAsTuples)}
    throw new TypeError('Unresolvable type');`;
        return asSelfExecuting(`${block}`);
    }
    else if (isMapType(type)) {
        const mapParsingStatements = `const keys = Object.keys(${inputVar});
    const output: ${generateFieldType(type, context)} = {};
    for(let i = 0; i < keys.length; i +=1 ) {
      const mapKey = keys[i];
      const mapValue = ${inputVar}[mapKey];
      output[mapKey] = ${generateAssignmentValue(type.values, context, 'mapValue')};
    }
    return output;`;
        return asSelfExecuting(mapParsingStatements);
    }
    return 'null';
}
function generateDeserializeFieldAssignment(field, context) {
    return `${field.name}: ${generateAssignmentValue(field.type, context, `input.${field.name}`)},`;
}
function generateDeserialize(type, context) {
    return `public static deserialize(input: ${avroWrapperName(type)}): ${className(type)} {
    return new ${className(type)}({
      ${type.fields.map((f) => generateDeserializeFieldAssignment(f, context)).join('\n')}
    })
  }`;
}

function getTypeKey(type, context) {
    if (isPrimitive(type)) {
        return type;
    }
    else if (isEnumType(type)) {
        return qualifiedName(type, enumName);
    }
    else if (isRecordType(type)) {
        return qualifiedName(type, className);
    }
    else if (isArrayType(type) || isMapType(type)) {
        return type.type;
    }
    else if (typeof type === 'string') {
        return getTypeKey(resolveReference(type, context), context);
    }
    throw new TypeError(`Unknown type`);
}
function quoteTypeKey(key) {
    if (key.indexOf('.') >= 0) {
        return `'${key}'`;
    }
    return key;
}
function generateAvroWrapperFieldType(type, context) {
    if (isPrimitive(type)) {
        return generatePrimitive(type);
    }
    else if (isEnumType(type)) {
        return qEnumName(type, context);
    }
    else if (isRecordType(type)) {
        return qAvroWrapperName(type, context);
    }
    else if (isArrayType(type)) {
        const itemsType = generateAvroWrapperFieldType(type.items, context);
        return isUnion(type.items) && type.items.length > 1 ? `(${itemsType})[]` : `${itemsType}[]`;
    }
    else if (isUnion(type)) {
        if (type.length === 1) {
            return generateAvroWrapperFieldType(type[0], context);
        }
        const withoutNull = type.filter((t) => t !== 'null');
        const hasNull = withoutNull.length !== type.length;
        const fields = withoutNull
            .map((t) => `${quoteTypeKey(getTypeKey(t, context))}?: ${generateAvroWrapperFieldType(t, context)}`)
            .join(',\n');
        return `{
      ${fields}
    }${hasNull ? '| null' : ''}`;
    }
    else if (isMapType(type)) {
        return `{ [index:string]:${generateAvroWrapperFieldType(type.values, context)} }`;
    }
    else if (typeof type === 'string') {
        return generateAvroWrapperFieldType(resolveReference(type, context), context);
    }
    else {
        throw new TypeError(`not ready for type ${type}`);
    }
}
function generateFieldDeclaration$1(field, context) {
    return `${field.name}: ${generateAvroWrapperFieldType(field.type, context)}`;
}
function generateAvroWrapper(type, context) {
    return `export interface ${avroWrapperName(type)} {
    ${type.fields.map((field) => generateFieldDeclaration$1(field, context)).join('\n')}
  }`;
}

function getKey$1(t, context) {
    if (!isPrimitive(t) && typeof t === 'string') {
        return getKey$1(resolveReference(t, context), context);
    }
    else if (isEnumType(t) || isRecordType(t)) {
        return `'${qualifiedName(t)}'`;
    }
    else {
        return `'${getTypeName(t, context)}'`;
    }
}
function generateCondition(type, context, inputVar) {
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
        return `${inputVar} instanceof ${qClassName(type, context)}`;
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
        return generateCondition(resolveReference(type, context), context, inputVar);
    }
    throw new TypeError(`Unknown type ${JSON.stringify(type)}`);
}
function generateUnionWrapper(type, context, inputVar) {
    if (isPrimitive(type) || isArrayType(type) || isMapType(type) || isEnumType(type) || isRecordType(type)) {
        return `return { ${getKey$1(type, context)}: ${generateAssignmentValue$1(type, context, inputVar)} }`;
    }
    else if (typeof type === 'string') {
        return generateUnionWrapper(resolveReference(type, context), context, inputVar);
    }
    else {
        throw new TypeError(`Unknown type ${type}`);
    }
}
function generateAssignmentValue$1(type, context, inputVar) {
    if (isPrimitive(type) || isEnumType(type)) {
        return inputVar;
    }
    else if (isRecordType(type)) {
        return `${qClassName(type, context)}.serialize(${inputVar})`;
    }
    else if (isArrayType(type)) {
        if (isUnion(type.items) && type.items.length > 1) {
            return `${inputVar}.map((e) => {
        return ${generateAssignmentValue$1(type.items, context, 'e')}
      })`;
        }
        return `${inputVar}.map((e) => ${generateAssignmentValue$1(type.items, context, 'e')})`;
    }
    else if (isUnion(type)) {
        if (type.length === 1) {
            return generateAssignmentValue$1(type[0], context, inputVar);
        }
        const hasNull = type.indexOf('null') >= 0;
        const withoutNull = type.filter((t) => t !== 'null');
        let conditions = withoutNull.map((t) => generateCondition(t, context, inputVar));
        let values = withoutNull.map((t) => generateUnionWrapper(t, context, inputVar));
        if (hasNull) {
            conditions = [`${inputVar} === null`].concat(conditions);
            values = [`return null`].concat(values);
        }
        let branches = conditions.map((c, i) => [c, values[i]]);
        const block = `${joinConditional(branches)}
    throw new TypeError('Unserializable type!')`;
        return asSelfExecuting(block);
    }
    else if (isMapType(type)) {
        const mapParsingStatements = `const keys = Object.keys(${inputVar});
    const output: ${generateAvroWrapperFieldType(type, context)} = {};
    for(let i = 0; i < keys.length; i +=1 ) {
      const mapKey = keys[i];
      const mapValue = ${inputVar}[mapKey];
      output[mapKey] = ${generateAssignmentValue$1(type.values, context, 'mapValue')};
    }
    return output;`;
        return asSelfExecuting(mapParsingStatements);
    }
    else if (typeof type === 'string') {
        return generateAssignmentValue$1(resolveReference(type, context), context, inputVar);
    }
    else {
        throw new TypeError(`not ready for type ${type}`);
    }
}
function generateFieldAssginment(field, context) {
    return `${field.name}: ${generateAssignmentValue$1(field.type, context, `input.${field.name}`)}`;
}
function generateSerialize(type, context) {
    return `public static serialize(input: ${className(type)}): ${avroWrapperName(type)} {
    return {
      ${type.fields.map((field) => generateFieldAssginment(field, context))}
    }
  }`;
}

function generateClassFieldDeclaration(field, context) {
    return `public ${field.name}: ${generateFieldType(field.type, context)}`;
}
function generateClass(type, context) {
    const assignments = type.fields.length === 0
        ? '/* noop */'
        : type.fields.map((field) => `this.${field.name} = input.${field.name};`).join('\n');
    return `export class ${className(type)} implements ${interfaceName(type)} {
    ${type.fields.map((f) => generateClassFieldDeclaration(f, context)).join('\n')}
    constructor(input: Partial<${interfaceName(type)}>) {
      ${assignments}
    }
    ${generateDeserialize(type, context)}
    ${generateSerialize(type, context)}
  }`;
}

function generateEnum(type) {
    return `export enum ${enumName(type)} {
    ${type.symbols.map((symbol) => `${symbol} = '${symbol}'`).join(',\n')}
  }`;
}
function generateStringUnion(type) {
    return `export type ${enumName(type)} = ${type.symbols.map((symbol) => `'${symbol}'`).join(' | ')}`;
}
function generateEnumType(type, context) {
    if (context.options.convertEnumToType) {
        return generateStringUnion(type);
    }
    return generateEnum(type);
}

function generateContent(recordTypes, enumTypes, context) {
    const sortedEnums = enumTypes.sort(alphaComparator);
    const sortedRecords = recordTypes.sort(alphaComparator);
    const enums = sortedEnums.map((t) => generateEnumType(t, context));
    const interfaces = sortedRecords.map((t) => generateInterface(t, context));
    const avroWrappers = sortedRecords.map((t) => generateAvroWrapper(t, context));
    const classes = sortedRecords.map((t) => generateClass(t, context));
    return []
        .concat(enums)
        .concat(interfaces)
        .concat(avroWrappers)
        .concat(classes)
        .join('\n');
}

function generateNamespace(namespace, records, enums, context) {
    if (namespace === null) {
        return generateContent(records, enums, context);
    }
    return `export namespace ${namespace} {
    ${generateContent(records, enums, context)}
  }`;
}

function getNameToTypeMapping(types) {
    return new Map(types.map((type) => [qualifiedName(type), type]));
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
function generateAll(record, options) {
    const context = {
        options,
        fqnResolver: new FqnResolver(),
        nameToTypeMapping: new Map(),
    };
    const type = addNamespaces(record, context);
    const enumTypes = getAllEnumTypes(type, []);
    const recordTypes = getAllRecordTypes(type, []);
    const allNamedTypes = [].concat(enumTypes, recordTypes);
    context.nameToTypeMapping = getNameToTypeMapping(allNamedTypes);
    if (options.removeNameSpace) {
        return generateContent(recordTypes, enumTypes, context);
    }
    else {
        const namespaces = Array.from(collectNamespaces(allNamedTypes));
        const recordsGrouped = groupByNamespace(recordTypes);
        const enumsGrouped = groupByNamespace(enumTypes);
        const namespaceTypes = namespaces.map((ns) => [ns, recordsGrouped.get(ns) || [], enumsGrouped.get(ns) || []]);
        return namespaceTypes.map(([ns, records, enums]) => generateNamespace(ns, records, enums, context)).join('\n');
    }
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
function generateContent$1(schema, args) {
    const options = {
        convertEnumToType: Boolean(args.convertEnumToType),
        removeNameSpace: Boolean(args.removeNameSpace),
    };
    if (Boolean(args.customMode)) {
        return generateAll(schema, options);
    }
    else {
        return avroToTypeScript(schema, options);
    }
}
function convertAndSendToStdout(files, args) {
    const source = files
        .map((f) => {
        const content = fs.readFileSync(f, 'UTF8');
        const schema = JSON.parse(content);
        const tsContent = generateContent$1(schema, args);
        return `// Generated from ${path.basename(f)}\n\n${tsContent}\n`;
    })
        .join('\n');
    const formattedSource = prettier.format(source, {
        printWidth: 120,
        semi: true,
        parser: 'typescript',
        tabWidth: 2,
        useTabs: false,
        singleQuote: true,
        trailingComma: 'es5',
        bracketSpacing: true,
        arrowParens: 'always',
    });
    process.stdout.write(formattedSource);
}
const [, , ...valuableArgs] = process.argv;
const parsedArgs = minimist(valuableArgs, {
    alias: { f: 'file', c: 'convertEnumToType', r: 'removeNameSpace', x: 'customMode' },
    string: ['files'],
    boolean: ['convertEnumToType', 'removeNameSpace'],
});
const allRelevantFiles = collectAllFiles(parsedArgs);
convertAndSendToStdout(allRelevantFiles, parsedArgs);
