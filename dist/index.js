'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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

exports.avroToTypeScript = avroToTypeScript;
