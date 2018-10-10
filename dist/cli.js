#!/usr/bin/env node
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var argparse = require('argparse');
var fs = require('fs');
var path = require('path');
var prettier = _interopDefault(require('prettier'));
var chalk = _interopDefault(require('chalk'));

const PRIMITIVE_TYPES = ['string', 'boolean', 'long', 'int', 'double', 'float', 'bytes', 'null'];
const NUMBER_TYPES = ['long', 'int', 'double', 'float'];
function isRecordType(type) {
    return type instanceof Object && type.type === 'record';
}
function isArrayType(type) {
    return type instanceof Object && type.type === 'array';
}
function isMapType(type) {
    return type instanceof Object && type.type === 'map';
}
function isEnumType(type) {
    return type instanceof Object && type.type === 'enum';
}
function isUnion(type) {
    return type instanceof Array;
}
function isPrimitive(type) {
    return PRIMITIVE_TYPES.indexOf(type) >= 0;
}
function isNumericType(type) {
    return NUMBER_TYPES.indexOf(type) >= 0;
}
const DEFAULT_OPTIONS = {
    enums: "string" /* STRING */,
    types: "interfaces-only" /* INTERFACES_ONLY */,
    namespaces: false,
    duplicateTypeResolutionStrategy: "best-effort" /* BEST_EFFORT */,
};
function getOptions(opts) {
    return Object.assign({}, DEFAULT_OPTIONS, opts);
}

const constantCase = require('constant-case');
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
function typeGuardName(type) {
    return `is${type.name}`;
}
function cloneName(type) {
    return `clone${type.name}`;
}
function deserialiserName(type) {
    return `deserialize${type.name}`;
}
function serialiserName(type) {
    return `serialize${type.name}`;
}
function fqnConstantName(type) {
    return `${constantCase(type.name)}_FQN`;
}
function qualifiedNameFor(type, transform, context) {
    if (context.getOptions().namespaces) {
        return qualifiedName(type, transform);
    }
    return transform(type);
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
function qTypeGuardName(type, context) {
    return qualifiedNameFor(type, typeGuardName, context);
}
function qCloneName(type, context) {
    return qualifiedNameFor(type, cloneName, context);
}
function qDeserialiserName(type, context) {
    return qualifiedNameFor(type, deserialiserName, context);
}
function qSerialiserName(type, context) {
    return qualifiedNameFor(type, serialiserName, context);
}
function qualifiedName(type, transform = (e) => e.name) {
    return type.namespace ? `${type.namespace}.${transform(type)}` : transform(type);
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
function getTypeName(type) {
    if (isPrimitive(type)) {
        return type;
    }
    else if (isArrayType(type) || isMapType(type)) {
        return type.type;
    }
    else if (isRecordType(type) || isEnumType(type)) {
        return qualifiedName(type);
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
function generateFieldType(type, context) {
    if (isPrimitive(type)) {
        return generatePrimitive(type);
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
    if (isEnumType(t) || isRecordType(t)) {
        return context.getOptions().namespaces ? `'${qualifiedName(t)}'` : fqnConstantName(t);
    }
    else {
        return `'${getTypeName(t)}'`;
    }
}
// Handling the case when cloning an array of record type. This saves extra function creations
function generateArrayDeserialize(type, context, inputVar) {
    let items = type.items;
    if (isUnion(items)) {
        return `${inputVar}.map((e) => {
      return ${generateAssignmentValue(items, context, 'e')}
    })`;
    }
    if (isRecordType(items) && context.getOptions().types === "interfaces-only" /* INTERFACES_ONLY */) {
        return `${inputVar}.map(${qDeserialiserName(items, context)})`;
    }
    return `${inputVar}.map((e) => ${generateAssignmentValue(items, context, 'e')})`;
}
function generateAssignmentValue(type, context, inputVar) {
    if ((typeof type === 'string' && isPrimitive(type)) || isEnumType(type)) {
        return `${inputVar}`;
    }
    else if (isRecordType(type)) {
        switch (context.getOptions().types) {
            case "classes" /* CLASSES */:
                return `${qClassName(type, context)}.deserialize(${inputVar})`;
            case "interfaces-only" /* INTERFACES_ONLY */:
                return `${qDeserialiserName(type, context)}(${inputVar})`;
        }
    }
    else if (isArrayType(type)) {
        return generateArrayDeserialize(type, context, inputVar);
    }
    else if (isUnion(type)) {
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
function generateStaticClassMethod(type, context) {
    return `public static deserialize(input: ${avroWrapperName(type)}): ${className(type)} {
    return new ${className(type)}({
      ${type.fields.map((f) => generateDeserializeFieldAssignment(f, context)).join('\n')}
    })
  }`;
}
function generateStandaloneMethod(type, context) {
    return `export function ${deserialiserName(type)}(input: ${avroWrapperName(type)}): ${interfaceName(type)} {
    return {
      ${type.fields.map((field) => generateDeserializeFieldAssignment(field, context)).join('\n')}
    }
  }`;
}
function generateDeserialize(type, context) {
    switch (context.getOptions().types) {
        case "classes" /* CLASSES */:
            return generateStaticClassMethod(type, context);
        case "interfaces-only" /* INTERFACES_ONLY */:
            return generateStandaloneMethod(type, context);
    }
}

function getTypeKey(type, context) {
    if (isPrimitive(type)) {
        return type;
    }
    else if (isEnumType(type)) {
        return context.getOptions().namespaces ? qualifiedName(type, enumName) : `[${fqnConstantName(type)}]`;
    }
    else if (isRecordType(type)) {
        return context.getOptions().namespaces ? qualifiedName(type, className) : `[${fqnConstantName(type)}]`;
    }
    else if (isArrayType(type) || isMapType(type)) {
        return type.type;
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
    if (isEnumType(t) || isRecordType(t)) {
        return context.getOptions().namespaces ? `'${qualifiedName(t)}'` : `[${fqnConstantName(t)}]`;
    }
    else {
        return `'${getTypeName(t)}'`;
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
            case 'float':
            case 'double':
                return `typeof ${inputVar} === 'number'`;
            case 'bytes':
                return 'false /* bytes not implemented */';
        }
    }
    else if (isArrayType(type)) {
        return `Array.isArray(${inputVar})`;
    }
    else if (isRecordType(type)) {
        switch (context.getOptions().types) {
            case "classes" /* CLASSES */:
                return `${inputVar} instanceof ${qClassName(type, context)}`;
            case "interfaces-only" /* INTERFACES_ONLY */:
                return `${qTypeGuardName(type, context)}(${inputVar})`;
        }
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
    throw new TypeError(`Unknown type ${JSON.stringify(type)}`);
}
function generateUnionWrapper(type, context, inputVar) {
    if (isPrimitive(type) || isArrayType(type) || isMapType(type) || isEnumType(type) || isRecordType(type)) {
        return `return { ${getKey$1(type, context)}: ${generateAssignmentValue$1(type, context, inputVar)} }`;
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
        switch (context.getOptions().types) {
            case "classes" /* CLASSES */:
                return `${qClassName(type, context)}.serialize(${inputVar})`;
            case "interfaces-only" /* INTERFACES_ONLY */:
                return `${qSerialiserName(type, context)}(${inputVar})`;
        }
    }
    else if (isArrayType(type)) {
        return `${inputVar}.map((e) => ${generateAssignmentValue$1(type.items, context, 'e')})`;
    }
    else if (isUnion(type)) {
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
    else {
        throw new TypeError(`not ready for type ${type}`);
    }
}
function generateFieldAssginment(field, context) {
    return `${field.name}: ${generateAssignmentValue$1(field.type, context, `input.${field.name}`)},`;
}
function generateStaticClassMethod$1(type, context) {
    return `public static serialize(input: ${className(type)}): ${avroWrapperName(type)} {
    return {
      ${type.fields.map((field) => generateFieldAssginment(field, context)).join('\n')}
    }
  }`;
}
function generateStandaloneMethod$1(type, context) {
    return `export function ${serialiserName(type)}(input: ${interfaceName(type)}): ${avroWrapperName(type)} {
    return {
      ${type.fields.map((field) => generateFieldAssginment(field, context)).join('\n')}
    }
  }`;
}
function generateSerialize(type, context) {
    switch (context.getOptions().types) {
        case "classes" /* CLASSES */:
            return generateStaticClassMethod$1(type, context);
        case "interfaces-only" /* INTERFACES_ONLY */:
            return generateStandaloneMethod$1(type, context);
    }
}

// Handling the case when cloning an array of record type. This saves extra function creations
function generateArrayClone(type, context, inputVar) {
    let items = type.items;
    if (isUnion(items)) {
        return `${inputVar}.map((e) => {
      return ${generateAssignmentValue$2(items, context, 'e')}
    })`;
    }
    if (isRecordType(items) && context.getOptions().types === "interfaces-only" /* INTERFACES_ONLY */) {
        return `${inputVar}.map(${qCloneName(items, context)})`;
    }
    return `${inputVar}.map((e) => ${generateAssignmentValue$2(type.items, context, 'e')})`;
}
function generateAssignmentValue$2(type, context, inputVar) {
    if (isPrimitive(type) || isEnumType(type)) {
        return inputVar;
    }
    else if (isRecordType(type)) {
        switch (context.getOptions().types) {
            case "classes" /* CLASSES */:
                return `${qClassName(type, context)}.clone(${inputVar})`;
            case "interfaces-only" /* INTERFACES_ONLY */:
                return `${qCloneName(type, context)}(${inputVar})`;
        }
        return;
    }
    else if (isArrayType(type)) {
        return generateArrayClone(type, context, inputVar);
    }
    else if (isUnion(type)) {
        const hasNull = type.indexOf('null') >= 0;
        const withoutNull = type.filter((t) => t !== 'null');
        let conditions = withoutNull.map((t) => generateCondition(t, context, inputVar));
        let values = withoutNull.map((t) => `return ${generateAssignmentValue$2(t, context, inputVar)}`);
        if (hasNull) {
            conditions = [`${inputVar} === null`].concat(conditions);
            values = [`return null`].concat(values);
        }
        let branches = conditions.map((c, i) => [c, values[i]]);
        const block = `${joinConditional(branches)}
    throw new TypeError('Unrecognizable type!')`;
        return asSelfExecuting(block);
    }
    else if (isMapType(type)) {
        const mapParsingStatements = `const keys = Object.keys(${inputVar});
    const output: ${generateFieldType(type, context)} = {};
    for(let i = 0; i < keys.length; i +=1 ) {
      const mapKey = keys[i];
      const mapValue = ${inputVar}[mapKey];
      output[mapKey] = ${generateAssignmentValue$2(type.values, context, 'mapValue')};
    }
    return output;`;
        return asSelfExecuting(mapParsingStatements);
    }
    else {
        throw new TypeError(`not ready for type ${type}`);
    }
}
function generateFieldAssginment$1(field, context) {
    return `${field.name}: ${generateAssignmentValue$2(field.type, context, `input.${field.name}`)}`;
}
function generateStaticClassMethod$2(type, context) {
    return `public static clone(input: ${className(type)}): ${className(type)} {
    return new ${className(type)}({
      ${type.fields.map((field) => generateFieldAssginment$1(field, context)).join(',\n')}
    })
  }`;
}
function generateStandaloneMethod$2(type, context) {
    return `export function ${cloneName(type)}(input: ${interfaceName(type)}): ${interfaceName(type)} {
    return {
      ${type.fields.map((field) => generateFieldAssginment$1(field, context)).join(',\n')}
    }
  }`;
}
function generateClone(type, context) {
    switch (context.getOptions().types) {
        case "classes" /* CLASSES */:
            return generateStaticClassMethod$2(type, context);
        case "interfaces-only" /* INTERFACES_ONLY */:
            return generateStandaloneMethod$2(type, context);
    }
}

function generateClassFieldDeclaration(field, context) {
    return `public ${field.name}: ${generateFieldType(field.type, context)}`;
}
function generateClass(type, context) {
    const assignments = type.fields.map((field) => `this.${field.name} = input.${field.name};`).join('\n');
    return `export class ${className(type)} implements ${interfaceName(type)} {
    ${type.fields.map((f) => generateClassFieldDeclaration(f, context)).join('\n')}
    constructor(input: ${interfaceName(type)}) {
      ${type.fields.length === 0 ? '/* noop */' : assignments}
    }
    ${generateDeserialize(type, context)}
    ${generateSerialize(type, context)}
    ${generateClone(type, context)}
  }`;
}

function generateEnum(type) {
    return `export enum ${enumName(type)} {
    ${type.symbols.map((symbol) => `${symbol} = '${symbol}'`).join(',\n')}
  }`;
}
function generateConstEnum(type) {
    return `export const enum ${enumName(type)} {
    ${type.symbols.map((symbol) => `${symbol} = '${symbol}'`).join(',\n')}
  }`;
}
function generateStringUnion(type) {
    return `export type ${enumName(type)} = ${type.symbols.map((symbol) => `'${symbol}'`).join(' | ')}`;
}
function generateEnumType(type, context) {
    switch (context.getOptions().enums) {
        case "enum" /* ENUM */:
            return generateEnum(type);
        case "const-enum" /* CONST_ENUM */:
            return generateConstEnum(type);
        case "string" /* STRING */:
            return generateStringUnion(type);
    }
}

function generateFqnConstant(type) {
    return `export const ${fqnConstantName(type)} = '${qualifiedName(type)}'`;
}

function generateFieldPresenceChecks(type) {
    return type.fields.map((field) => `input.${field.name} !== undefined`).join(' && ');
}
function generateTypeGuard(type, context) {
    const extraChecks = type.fields.length === 0 ? '' : ` && ${generateFieldPresenceChecks(type)}`;
    return `export function ${typeGuardName(type)}(input: any): input is ${interfaceName(type)} {
    return input instanceof Object${extraChecks} && Object.keys(input).length === ${type.fields.length}
  }`;
}

function generateContent(recordTypes, enumTypes, context) {
    const fqns = context.getOptions().namespaces ? [] : context.getNamedTypes().map(generateFqnConstant);
    const enums = enumTypes.map((t) => generateEnumType(t, context));
    const interfaces = recordTypes.map((t) => generateInterface(t, context));
    const avroWrappers = recordTypes.map((t) => generateAvroWrapper(t, context));
    switch (context.getOptions().types) {
        case "classes" /* CLASSES */: {
            const classes = recordTypes.map((t) => generateClass(t, context));
            return []
                .concat(fqns)
                .concat(enums)
                .concat(interfaces)
                .concat(avroWrappers)
                .concat(classes)
                .join('\n');
        }
        case "interfaces-only" /* INTERFACES_ONLY */: {
            const typeGuards = recordTypes.map((t) => generateTypeGuard(t, context));
            const deserializers = recordTypes.map((t) => generateDeserialize(t, context));
            const serializers = recordTypes.map((t) => generateSerialize(t, context));
            return []
                .concat(fqns)
                .concat(enums)
                .concat(interfaces)
                .concat(avroWrappers)
                .concat(typeGuards)
                .concat(deserializers)
                .concat(serializers)
                .join('\n');
        }
    }
}

function generateNamespace(namespace, context) {
    const content = generateContent(context.getRecordTypesInNamespace(namespace), context.getEnumTypesInNamespace(namespace), context);
    if (!namespace) {
        return content;
    }
    return `export namespace ${namespace} {
    ${content}
  }`;
}

function setsEqual(set1, set2) {
    if (set1.size !== set2.size)
        return false;
    for (var e of set1) {
        if (!set2.has(e)) {
            return false;
        }
    }
    return true;
}
function alphaComparator(a, b) {
    if (a < b) {
        return -1;
    }
    else if (a > b) {
        return 1;
    }
    return 0;
}
function nameComparator(a, b) {
    return alphaComparator(a.name, b.name);
}
function collectRecordTypes(type, accumulatedTypes, visited = []) {
    if (visited.indexOf(type) >= 0) {
        return;
    }
    visited.push(type);
    if (isRecordType(type)) {
        accumulatedTypes.push(type);
        type.fields.forEach((field) => collectRecordTypes(field.type, accumulatedTypes, visited));
    }
    else if (isUnion(type)) {
        type.forEach((optionType) => collectRecordTypes(optionType, accumulatedTypes, visited));
    }
    else if (isArrayType(type)) {
        collectRecordTypes(type.items, accumulatedTypes, visited);
    }
    else if (isMapType(type)) {
        collectRecordTypes(type.values, accumulatedTypes, visited);
    }
}
function collectEnumTypes(type, accumulatedTypes, visited = []) {
    if (visited.indexOf(type) >= 0) {
        return;
    }
    visited.push(type);
    if (isEnumType(type)) {
        accumulatedTypes.push(type);
    }
    else if (isUnion(type)) {
        type.forEach((optionType) => collectEnumTypes(optionType, accumulatedTypes, visited));
    }
    else if (isRecordType(type)) {
        type.fields.forEach((field) => collectEnumTypes(field.type, accumulatedTypes, visited));
    }
    else if (isArrayType(type)) {
        collectEnumTypes(type.items, accumulatedTypes, visited);
    }
    else if (isMapType(type)) {
        collectEnumTypes(type.values, accumulatedTypes, visited);
    }
}
function replaceRefsHelper(type, replaceLocal, replacer) {
    if (typeof type === 'string' && !isPrimitive(type)) {
        const newType = replacer(type);
        replaceLocal(newType);
    }
    else if (isUnion(type) || isArrayType(type) || isMapType(type)) {
        replaceReferences(type, replacer);
    }
}
function replaceReferences(type, replacer) {
    if (isUnion(type)) {
        type.forEach((optionType, i) => {
            replaceRefsHelper(optionType, (newValue) => (type[i] = newValue), replacer);
        });
    }
    else if (isRecordType(type)) {
        type.fields.forEach((field) => {
            replaceRefsHelper(field.type, (newValue) => (field.type = newValue), replacer);
        });
    }
    else if (isArrayType(type)) {
        replaceRefsHelper(type.items, (newValue) => (type.items = newValue), replacer);
    }
    else if (isMapType(type)) {
        replaceRefsHelper(type.values, (newValue) => (type.values = newValue), replacer);
    }
}
function fqn(type) {
    if (type.namespace && type.namespace.length > 0) {
        return `${type.namespace}.${type.name}`;
    }
    return type.name;
}

class FullyQualifiedNameStore {
    constructor() {
        this.fqns = new Set();
    }
    add(type) {
        this.fqns.add(fqn(type));
    }
    get(name) {
        if (this.fqns.has(name)) {
            return name;
        }
        const arr = Array.from(this.fqns);
        const matching = arr.filter((fqn$$1) => {
            const segments = fqn$$1.split('.');
            return segments[segments.length - 1] === name;
        });
        switch (matching.length) {
            case 0:
                return null;
            case 1:
                return matching[0];
            default:
                throw new TypeError(`Multiple identical fqns for ${name}: ${matching.join(', ')}`);
        }
    }
}

class TypeByNameResolver {
    constructor(options) {
        this.mapping = new Map();
        this.options = options;
    }
    add(fqn$$1, type) {
        if (this.mapping.has(fqn$$1)) {
            return this.resolveDuplicateTypeBasedOnStrategy(fqn$$1, type);
        }
        this.mapping.set(fqn$$1, type);
    }
    get(fqn$$1) {
        return this.mapping.get(fqn$$1);
    }
    resolveDuplicateTypeBasedOnStrategy(fqn$$1, type) {
        switch (this.options.duplicateTypeResolutionStrategy) {
            case "fail" /* FAIL */: {
                throw new TypeError(`Duplicate qualified name in 2 or more schemas ${fqn$$1}!`);
            }
            case "best-effort" /* BEST_EFFORT */: {
                TypeByNameResolver.compareTypes(fqn$$1, this.mapping.get(fqn$$1), type);
            }
        }
    }
    static compareTypes(fqn$$1, oldType, newType) {
        if (oldType.type !== newType.type) {
            throw new TypeError(`Type "${fqn$$1}" has 2 versions with different types which are "${oldType.type}" and "${newType.type}"`);
        }
        if (isEnumType(oldType) && isEnumType(newType)) {
            const oldTypeSymbols = new Set(oldType.symbols);
            const newTypeSymbols = new Set(newType.symbols);
            if (!setsEqual(oldTypeSymbols, newTypeSymbols)) {
                const oldSymbols = oldType.symbols.map((s) => `"${s}"`).join(', ');
                const newSymbols = newType.symbols.map((s) => `"${s}"`).join(', ');
                throw new TypeError(`Enum type "${fqn$$1}" has 2 versions with different literals: ${oldSymbols} and ${newSymbols}`);
            }
        }
        if (isRecordType(oldType) && isRecordType(newType)) {
            const oldFields = new Set(oldType.fields.map((f) => f.name));
            const newFields = new Set(newType.fields.map((f) => f.name));
            if (!setsEqual(oldFields, newFields)) {
                const oldFieldNames = Array.from(oldFields)
                    .map((s) => `"${s}"`)
                    .join(', ');
                const newFieldNames = Array.from(newFields)
                    .map((s) => `"${s}"`)
                    .join(', ');
                throw new TypeError(`Record type "${fqn$$1}" has 2 versions with different field names: ${oldFieldNames} and ${newFieldNames}`);
            }
        }
    }
}

function matchesNamespace(ns) {
    return ({ namespace }) => {
        if (ns === null || ns === undefined) {
            return namespace === null || namespace === undefined;
        }
        return ns === namespace;
    };
}
class AbstractNamespacedTypesProvider {
    getEnumTypesInNamespace(namespace) {
        return this.getEnumTypes().filter(matchesNamespace(namespace));
    }
    getRecordTypesInNamespace(namespace) {
        return this.getRecordTypes().filter(matchesNamespace(namespace));
    }
    getNamedTypesInNamespace(namespace) {
        return this.getNamedTypes().filter(matchesNamespace(namespace));
    }
    getEnumType(qualifiedName) {
        return this.getEnumTypes().find((e) => fqn(e) === qualifiedName);
    }
    getRecordType(qualifiedName) {
        return this.getRecordTypes().find((e) => fqn(e) === qualifiedName);
    }
    getNamedType(qualifiedName) {
        return this.getNamedTypes().find((e) => fqn(e) === qualifiedName);
    }
}

class TypeContext extends AbstractNamespacedTypesProvider {
    constructor(unit, options, autoresolve = true) {
        super();
        this._options = getOptions(options);
        this._rootType = JSON.parse(JSON.stringify(unit.rootType));
        this._unit = unit;
        const fqns = new FullyQualifiedNameStore();
        TypeContext._addNamespacesToNamedTypes(this._rootType, null, fqns);
        this.getRecordTypes().forEach((record) => TypeContext._replaceRefsWithFullyQualifiedRefs(record, fqns));
        if (autoresolve) {
            const resolver = new TypeByNameResolver(this.getOptions());
            this.addTypes(resolver);
            this.resolveTypes(resolver);
        }
    }
    getCompilationUnit() {
        return this._unit;
    }
    getOptions() {
        return this._options;
    }
    getRecordTypes() {
        const recordTypes = [];
        collectRecordTypes(this._rootType, recordTypes);
        return recordTypes.sort(nameComparator);
    }
    getEnumTypes() {
        const enumTypes = [];
        collectEnumTypes(this._rootType, enumTypes);
        return enumTypes.sort(nameComparator);
    }
    getNamedTypes() {
        return []
            .concat(this.getRecordTypes())
            .concat(this.getEnumTypes())
            .sort(nameComparator);
    }
    getNamespaces() {
        const withDuplicates = this.getNamedTypes().map(({ namespace }) => namespace);
        const uniques = new Set(withDuplicates);
        return Array.from(uniques)
            .map((namespace) => (typeof namespace === 'string' ? namespace : null))
            .sort(alphaComparator);
    }
    resolveTypes(resolver) {
        this.getRecordTypes().forEach((record) => TypeContext._resolveReferenceFullyQualifiedRefs(record, resolver));
    }
    addTypes(resolver) {
        this.getNamedTypes().forEach((type) => resolver.add(fqn(type), type));
    }
    static _addNamespacesToNamedTypes(type, namespace, fqnResolver) {
        if (isUnion(type)) {
            type.forEach((tp) => TypeContext._addNamespacesToNamedTypes(tp, namespace, fqnResolver));
        }
        else if (isEnumType(type)) {
            type.namespace = type.namespace || namespace;
            fqnResolver.add(type);
        }
        else if (isRecordType(type)) {
            type.namespace = type.namespace || namespace;
            fqnResolver.add(type);
            type.fields.forEach((field) => TypeContext._addNamespacesToNamedTypes(field.type, type.namespace, fqnResolver));
        }
        else if (isArrayType(type)) {
            TypeContext._addNamespacesToNamedTypes(type.items, namespace, fqnResolver);
        }
        else if (isMapType(type)) {
            TypeContext._addNamespacesToNamedTypes(type.values, namespace, fqnResolver);
        }
    }
    static _replaceRefsWithFullyQualifiedRefs(type, fqnResolver) {
        replaceReferences(type, (typeName) => fqnResolver.get(typeName));
    }
    static _resolveReferenceFullyQualifiedRefs(type, nameToTypeMapping) {
        replaceReferences(type, (fqn$$1) => nameToTypeMapping.get(fqn$$1));
    }
}

class RootTypeContext extends AbstractNamespacedTypesProvider {
    constructor(units, options = {}) {
        super();
        this._compilationUnits = units;
        this._options = getOptions(options);
        this._typeContexts = this._compilationUnits.map((unit) => new TypeContext(unit, this.getOptions(), false));
        const resolver = new TypeByNameResolver(this.getOptions());
        this._typeContexts.forEach((context) => context.addTypes(resolver));
        this._typeContexts.forEach((context) => context.resolveTypes(resolver));
        this._enumTypes = this.collectUniqueTypes((context) => context.getEnumTypes(), resolver);
        this._recordTypes = this.collectUniqueTypes((context) => context.getRecordTypes(), resolver);
        this._namedTypes = []
            .concat(this.getRecordTypes())
            .concat(this.getEnumTypes())
            .sort(nameComparator);
    }
    getTypeContexts() {
        return this._typeContexts;
    }
    getCompilationUnits() {
        return this._compilationUnits;
    }
    getOptions() {
        return this._options;
    }
    getRecordTypes() {
        return this._recordTypes;
    }
    getEnumTypes() {
        return this._enumTypes;
    }
    getNamedTypes() {
        return this._namedTypes;
    }
    getNamespaces() {
        if (!Array.isArray(this._namespaces)) {
            const withDuplicates = this.getNamedTypes().map(({ namespace }) => namespace);
            const uniqueNamespaces = new Set(withDuplicates);
            this._namespaces = Array.from(uniqueNamespaces).sort(alphaComparator);
        }
        return this._namespaces;
    }
    collectUniqueTypes(getter, resolver) {
        const nestedValues = this.getTypeContexts().map(getter);
        const nonUniqueNames = [].concat(...nestedValues).map(fqn);
        const uniqueNames = Array.from(new Set(nonUniqueNames));
        const typesFromResolver = uniqueNames.map((name) => resolver.get(name)).sort(nameComparator);
        return typesFromResolver;
    }
}

function generateAll(units, options = {}) {
    const context = new RootTypeContext(units, options);
    if (options.namespaces) {
        return context
            .getNamespaces()
            .map((namespace) => generateNamespace(namespace, context))
            .join('\n');
    }
    else {
        return generateContent(context.getRecordTypes(), context.getEnumTypes(), context);
    }
}

const parser = new argparse.ArgumentParser({
    description: 'Avro schema to TypeScript generator',
});
const subParsers = parser.addSubparsers({
    title: 'subcommands',
    dest: 'command',
});
const diagnoseParser = subParsers.addParser("diagnose" /* DIAGNOSE */.toString(), {
    description: 'Diagnoses the input file(s), gives suggestions on options.',
});
diagnoseParser.addArgument(['--file', '-f'], {
    required: true,
    action: 'append',
    dest: 'files',
    help: 'Path to the .avsc file(s) to be consumed.',
});
const generateParser = subParsers.addParser("gen" /* GENERATE */.toString(), {
    description: 'Generates TypeScript from the given input file(s).',
});
generateParser.addArgument(['--file', '-f'], {
    required: true,
    action: 'append',
    dest: 'files',
    help: 'Path to the .avsc file(s) to be consumed.',
});
generateParser.addArgument(['--enums', '-e'], {
    required: false,
    dest: 'enums',
    defaultValue: DEFAULT_OPTIONS.enums,
    choices: ["string" /* STRING */, "enum" /* ENUM */, "const-enum" /* CONST_ENUM */],
    help: 'The type of the generated enums.',
});
generateParser.addArgument(['--types', '-t'], {
    required: false,
    dest: 'types',
    defaultValue: DEFAULT_OPTIONS.types,
    choices: ["interfaces-only" /* INTERFACES_ONLY */, "classes" /* CLASSES */],
    help: 'The type of the generated types.',
});
generateParser.addArgument(['--namespaces', '-n'], {
    required: false,
    dest: 'namespaces',
    action: 'storeTrue',
    defaultValue: DEFAULT_OPTIONS.namespaces,
    choices: ["string" /* STRING */, "enum" /* ENUM */, "const-enum" /* CONST_ENUM */],
    help: 'Flag indicating if namespaces should be generated or not.',
});

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
function getAllFiles(files) {
    const rawFiles = files.map((f) => path.resolve(f));
    const allFiles = [];
    rawFiles.forEach((rawFile) => collectFiles(rawFile, allFiles));
    return allFiles;
}
function readSchema(file) {
    const content = fs.readFileSync(file, 'UTF8');
    const schema = JSON.parse(content);
    return schema;
}
function format(source) {
    return prettier.format(source, {
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
}
function writeTypescriptOutput(source) {
    process.stdout.write(format(source));
}

function getFieldNames(type, context) {
    return isRecordType(type) ? new Set(type.fields.map((f) => f.name)) : null;
}
function getRecordTypeDiagnostics(owner, field, types, context) {
    const fieldTypeNames = types
        .map((type) => [type, getFieldNames(type, context)])
        .filter(([, names]) => names !== null);
    const similarTypes = {};
    for (const [outerType, outerFieldNames] of fieldTypeNames) {
        const outerName = qualifiedName(outerType, className);
        similarTypes[outerName] = [];
        for (const [innerType, innerFieldNames] of fieldTypeNames) {
            if (outerType === innerType) {
                continue;
            }
            if (setsEqual(outerFieldNames, innerFieldNames)) {
                const innerName = qualifiedName(innerType, className);
                if (similarTypes[innerName] && similarTypes[innerName].indexOf(outerName) >= 0) {
                    continue;
                }
                similarTypes[outerName].push(innerName);
            }
        }
    }
    const diagnostics = [];
    for (const type of Object.keys(similarTypes)) {
        const alternatives = similarTypes[type];
        if (alternatives.length > 0) {
            diagnostics.push({
                typeName: qualifiedName(owner, className),
                fieldName: field.name,
                alternatives: [type].concat(alternatives),
                similarity: "FIELD_COUNT" /* FIELD_COUNT */,
            });
        }
    }
    return diagnostics;
}
function getNumberTypeDiagnostics(owner, field, types, context) {
    const numberTypes = types.filter((type) => isNumericType(type)).map((type) => type);
    if (numberTypes.length >= 2) {
        return [
            {
                typeName: qClassName(owner, context),
                alternatives: numberTypes,
                fieldName: field.name,
                similarity: "NUMERIC" /* NUMERIC */,
            },
        ];
    }
    return [];
}
function getTypeSimilarityDiagnostics(types, context) {
    const diagnostics = [];
    for (const t of types) {
        for (const f of t.fields) {
            const { type: fieldType } = f;
            if (isUnion(fieldType)) {
                diagnostics.push(...getRecordTypeDiagnostics(t, f, fieldType, context));
                diagnostics.push(...getNumberTypeDiagnostics(t, f, fieldType, context));
            }
            else if (isArrayType(fieldType) && isUnion(fieldType.items)) {
                diagnostics.push(...getRecordTypeDiagnostics(t, f, fieldType.items, context));
                diagnostics.push(...getNumberTypeDiagnostics(t, f, fieldType.items, context));
            }
            else if (isMapType(fieldType) && isUnion(fieldType.values)) {
                diagnostics.push(...getRecordTypeDiagnostics(t, f, fieldType.values, context));
                diagnostics.push(...getNumberTypeDiagnostics(t, f, fieldType.values, context));
            }
        }
    }
    return diagnostics;
}

function getBaseMessage(similarity) {
    const commonMessage = chalk.gray('(these are indistinguishable at runtime)');
    switch (similarity) {
        case "FIELD_COUNT" /* FIELD_COUNT */:
            return `multiple alternatives have the same number of fields with the same name(s) ${commonMessage}`;
        case "NUMERIC" /* NUMERIC */:
            return `multiple alternatives are of numeric types ${commonMessage}`;
    }
}
function generateSimilarityReport(diagnostic) {
    const alternativesStr = diagnostic.alternatives.map((alternative) => `    - ${chalk.gray(alternative)}`).join('\n');
    const qFieldName = `${chalk.red(diagnostic.typeName)}#${chalk.red(diagnostic.fieldName)}`;
    return `  ${chalk.red('✖')} In field ${qFieldName} ${getBaseMessage(diagnostic.similarity)}:\n${alternativesStr}`;
}
function reportTypeSimilarityDiagnostics(filename, diagnostics) {
    if (diagnostics.length === 0) {
        return null;
    }
    const reports = diagnostics.map(generateSimilarityReport).join('\n');
    return `Can't reliably generate ${chalk.bold.yellow('type guards')} from ${chalk.red(filename)} beacuse:\n${reports}`;
}

function performDiagnostics(filename, rootType, options) {
    const context = new TypeContext({ filename, rootType }, options);
    const diagnostics = getTypeSimilarityDiagnostics(context.getRecordTypes(), context);
    const report = reportTypeSimilarityDiagnostics(filename, diagnostics);
    process.stderr.write(`${report}\n`);
}

const args = parser.parseArgs();
switch (args.command) {
    case "diagnose" /* DIAGNOSE */:
        getAllFiles(args.files).forEach((f) => performDiagnostics(f, readSchema(f), args));
        break;
    case "gen" /* GENERATE */: {
        const compilationUnits = getAllFiles(args.files).map((filename) => ({
            filename,
            rootType: readSchema(filename),
        }));
        writeTypescriptOutput(generateAll(compilationUnits, args));
        break;
    }
}
