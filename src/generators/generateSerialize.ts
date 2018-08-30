import { RecordType, Field, isPrimitive, isEnumType, isRecordType, isArrayType, isUnion, isMapType } from '../model'
import {
  asSelfExecuting,
  joinConditional,
  qualifiedName,
  getTypeName,
  resolveReference,
  qClassName,
  className,
  avroWrapperName,
} from './utils'
import { GeneratorContext } from './typings'
import { generateAvroWrapperFieldType } from './generateAvroWrapper'

function getKey(t: any, context: GeneratorContext) {
  if (!isPrimitive(t) && typeof t === 'string') {
    return getKey(resolveReference(t, context), context)
  } else if (isEnumType(t) || isRecordType(t)) {
    return `'${qualifiedName(t)}'`
  } else {
    return `'${getTypeName(t, context)}'`
  }
}

function generateCondition(type: any, context: GeneratorContext, inputVar: string) {
  if (isPrimitive(type)) {
    switch (type) {
      case 'string':
        return `typeof ${inputVar} === 'string'`
      case 'boolean':
        return `typeof ${inputVar} === 'boolean'`
      case 'int':
      case 'long':
        return `typeof ${inputVar} === 'number' && ${inputVar} % 1 === 0`
      case 'float':
      case 'double':
        return `typeof ${inputVar} === 'number' && ${inputVar} % 1 !== 0`
      /* case 'bytes':
        return `typeof ${inputVar} === Buffer` */
    }
  } else if (isArrayType(type)) {
    return `Array.isArray(${inputVar})`
  } else if (isRecordType(type)) {
    return `${inputVar} instanceof ${qClassName(type, context)}`
  } else if (isEnumType(type)) {
    return `typeof ${inputVar} === 'string' && [${type.symbols
      .map((s) => `'${s}'`)
      .join(',')}].indexOf(${inputVar}) >= 0`
  } else if (isMapType(type)) {
    return `typeof ${inputVar} === 'object'` // TODO
  } else if (typeof type === 'string') {
    return generateCondition(resolveReference(type, context), context, inputVar)
  }
  throw new TypeError(`Unknown type ${JSON.stringify(type)}`)
}

function generateUnionWrapper(type: any, context: GeneratorContext, inputVar: string) {
  if (isPrimitive(type) || isArrayType(type) || isMapType(type) || isEnumType(type) || isRecordType(type)) {
    return `return { ${getKey(type, context)}: ${generateAssignmentValue(type, context, inputVar)} }`
  } else if (typeof type === 'string') {
    return generateUnionWrapper(resolveReference(type, context), context, inputVar)
  } else {
    throw new TypeError(`Unknown type ${type}`)
  }
}

function generateAssignmentValue(type: any, context: GeneratorContext, inputVar: string): string {
  if (isPrimitive(type) || isEnumType(type)) {
    return inputVar
  } else if (isRecordType(type)) {
    return `${qClassName(type, context)}.serialize(${inputVar})`
  } else if (isArrayType(type)) {
    if (isUnion(type.items) && type.items.length > 1) {
      return `${inputVar}.map((e) => {
        return ${generateAssignmentValue(type.items, context, 'e')}
      })`
    }
    return `${inputVar}.map((e) => ${generateAssignmentValue(type.items, context, 'e')})`
  } else if (isUnion(type)) {
    if (type.length === 1) {
      return generateAssignmentValue(type[0], context, inputVar)
    }
    const hasNull = type.indexOf('null' as any) >= 0
    const withoutNull = type.filter((t) => (t as any) !== 'null')
    let conditions = withoutNull.map((t) => generateCondition(t, context, inputVar))
    let values = withoutNull.map((t) => generateUnionWrapper(t, context, inputVar))
    if (hasNull) {
      conditions = [`${inputVar} === null`].concat(conditions)
      values = [`return null`].concat(values)
    }
    let branches = conditions.map((c, i) => [c, values[i]] as [string, string])
    const block = `${joinConditional(branches)}
    throw new TypeError('Unserializable type!')`
    return asSelfExecuting(block)
  } else if (isMapType(type)) {
    const mapParsingStatements = `const keys = Object.keys(${inputVar});
    const output: ${generateAvroWrapperFieldType(type, context)} = {};
    for(let i = 0; i < keys.length; i +=1 ) {
      const mapKey = keys[i];
      const mapValue = ${inputVar}[mapKey];
      output[mapKey] = ${generateAssignmentValue(type.values, context, 'mapValue')};
    }
    return output;`
    return asSelfExecuting(mapParsingStatements)
  } else if (typeof type === 'string') {
    return generateAssignmentValue(resolveReference(type, context), context, inputVar)
  } else {
    throw new TypeError(`not ready for type ${type}`)
  }
}

function generateFieldAssginment(field: Field, context: GeneratorContext): string {
  return `${field.name}: ${generateAssignmentValue(field.type, context, `input.${field.name}`)}`
}

export function generateSerialize(type: RecordType, context: GeneratorContext): string {
  return `public static serialize(input: ${className(type)}): ${avroWrapperName(type)} {
    return {
      ${type.fields.map((field) => generateFieldAssginment(field, context))}
    }
  }`
}
