import {
  RecordType,
  Field,
  isPrimitive,
  isEnumType,
  isRecordType,
  isArrayType,
  isUnion,
  isMapType,
  TypeVariant,
  GeneratorContext,
} from '../model'
import {
  asSelfExecuting,
  joinConditional,
  qualifiedName,
  getTypeName,
  resolveReference,
  qClassName,
  className,
  avroWrapperName,
  fqnConstantName,
  qTypeGuardName,
  serialiserName,
  interfaceName,
  qSerialiserName,
} from './utils'
import { generateAvroWrapperFieldType } from './generateAvroWrapper'

function getKey(t: any, context: GeneratorContext) {
  if (!isPrimitive(t) && typeof t === 'string') {
    return getKey(resolveReference(t, context), context)
  } else if (isEnumType(t) || isRecordType(t)) {
    return context.options.namespaces ? `'${qualifiedName(t)}'` : `[${fqnConstantName(t)}]`
  } else {
    return `'${getTypeName(t, context)}'`
  }
}

export function generateCondition(type: any, context: GeneratorContext, inputVar: string) {
  if (isPrimitive(type)) {
    switch (type) {
      case 'string':
        return `typeof ${inputVar} === 'string'`
      case 'boolean':
        return `typeof ${inputVar} === 'boolean'`
      case 'int':
      case 'long':
      case 'float':
      case 'double':
        return `typeof ${inputVar} === 'number'`
      case 'bytes':
        return 'false /* bytes not implemented */'
    }
  } else if (isArrayType(type)) {
    return `Array.isArray(${inputVar})`
  } else if (isRecordType(type)) {
    switch (context.options.types) {
      case TypeVariant.CLASSES:
        return `${inputVar} instanceof ${qClassName(type, context)}`
      case TypeVariant.INTERFACES_ONLY:
        return `${qTypeGuardName(type, context)}(${inputVar})`
    }
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
    switch (context.options.types) {
      case TypeVariant.CLASSES:
        return `${qClassName(type, context)}.serialize(${inputVar})`
      case TypeVariant.INTERFACES_ONLY:
        return `${qSerialiserName(type, context)}(${inputVar})`
    }
  } else if (isArrayType(type)) {
    return `${inputVar}.map((e) => ${generateAssignmentValue(type.items, context, 'e')})`
  } else if (isUnion(type)) {
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
  return `${field.name}: ${generateAssignmentValue(field.type, context, `input.${field.name}`)},`
}

function generateStaticClassMethod(type: RecordType, context: GeneratorContext): string {
  return `public static serialize(input: ${className(type)}): ${avroWrapperName(type)} {
    return {
      ${type.fields.map((field) => generateFieldAssginment(field, context)).join('\n')}
    }
  }`
}

function generateStandaloneMethod(type: RecordType, context: GeneratorContext): string {
  return `export function ${serialiserName(type)}(input: ${interfaceName(type)}): ${avroWrapperName(type)} {
    return {
      ${type.fields.map((field) => generateFieldAssginment(field, context)).join('\n')}
    }
  }`
}

export function generateSerialize(type: RecordType, context: GeneratorContext) {
  switch (context.options.types) {
    case TypeVariant.CLASSES:
      return generateStaticClassMethod(type, context)
    case TypeVariant.INTERFACES_ONLY:
      return generateStandaloneMethod(type, context)
  }
}
