"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var model_1 = require("./model");
/*Global variable */
var options = {
    convertEnumToType: false,
    removeNameSpace: false,
};
/** Converts an Avro record type to a TypeScript file */
function avroToTypeScript(recordType, userOptions) {
    var output = [];
    options = __assign({}, options, userOptions);
    convertRecord(recordType, output);
    return output.join('\n');
}
exports.avroToTypeScript = avroToTypeScript;
/** Convert an Avro Record type. Return the name, but add the definition to the file */
function convertRecord(recordType, fileBuffer) {
    var buffer = "export interface " + removeNameSpace(recordType.name) + " {\n";
    for (var _i = 0, _a = recordType.fields; _i < _a.length; _i++) {
        var field = _a[_i];
        buffer += convertFieldDec(field, fileBuffer) + '\n';
    }
    buffer += '}\n';
    fileBuffer.push(buffer);
    return recordType.name;
}
/** Convert an Avro Enum type. Return the name, but add the definition to the file */
function convertEnum(enumType, fileBuffer) {
    var enumDef = "export enum " + enumType.name + " { " + enumType.symbols
        .join(', ') + " }\n";
    fileBuffer.push(enumDef);
    return enumType.name;
}
/** Convert an Avro string litteral type. Return the name, but add the definition to the file */
function convertEnumToType(enumType, fileBuffer) {
    var enumDef = "export type " + enumType.name + "  =  " + enumType.symbols
        .map(function (symbol) { return "'" + symbol + "'"; })
        .join(' | ') + "\n";
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
        return type.map(function (t) { return removeNameSpace(convertType(t, buffer)); }).join(' | ');
    }
    else if (model_1.isRecordType(type)) {
        // } type)) {
        // record, use the name and add to the buffer
        return convertRecord(type, buffer);
    }
    else if (model_1.isArrayType(type)) {
        // array, call recursively for the array element type
        if ([].concat(type.items).length === 1) {
            return convertType(type.items, buffer) + "[]";
        }
        return "(" + convertType(type.items, buffer) + ")[]";
    }
    else if (model_1.isMapType(type)) {
        // Dictionary of types, string as key
        return "{ [index:string]:" + convertType(type.values, buffer) + " }";
    }
    else if (model_1.isEnumType(type)) {
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
    return "\t" + field.name + (model_1.isOptional(field.type) ? '?' : '') + ": " + convertType(field.type, buffer);
}
