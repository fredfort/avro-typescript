import {
  RecordType,
  Field,
  isPrimitive,
  isEnumType,
  isRecordType,
  isArrayType,
  isUnion,
  isMapType,
  HasName,
} from '../model'
import { asSelfExecuting, joinConditional, className, qualifiedName, getTypeName, resolveReference } from './utils'
import { FqnResolver } from './FqnResolver'

function getKey(t: any, fqns: FqnResolver) {
  if (isRecordType(t)) {
    return `[${className(t)}.FQN]`
  } else if (isEnumType(t)) {
    return `'${qualifiedName(t)}'`
  } else {
    return `'${getTypeName(t, fqns)}'`
  }
}

function generateCondition(type: any, fqns: FqnResolver, mapping: Map<string, HasName>, inputVar: string) {
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
    return `${inputVar} instanceof ${className(type)}`
  } else if (isEnumType(type)) {
    return `typeof ${inputVar} === 'string' && [${type.symbols
      .map((s) => `'${s}'`)
      .join(',')}].indexOf(${inputVar}) >= 0`
  } else if (isMapType(type)) {
    return `typeof ${inputVar} === 'object'` // TODO
  } else if (typeof type === 'string') {
    return generateCondition(resolveReference(type, fqns, mapping), fqns, mapping, inputVar)
  }
  throw new TypeError(`Unknown type ${JSON.stringify(type)}`)
}

function generateUnionWrapper(type: any, fqns: FqnResolver, mapping: Map<string, HasName>, inputVar: string) {
  if (isPrimitive(type) || isArrayType(type) || isMapType(type) || isEnumType(type) || isRecordType(type)) {
    return `return { ${getKey(type, fqns)}: ${generateAssignmentValue(type, fqns, mapping, inputVar)} }`
  } else if (typeof type === 'string') {
    return generateUnionWrapper(resolveReference(type, fqns, mapping), fqns, mapping, inputVar)
  } else {
    throw new TypeError(`Unknown type ${type}`)
  }
}

function generateAssignmentValue(
  type: any,
  fqns: FqnResolver,
  mapping: Map<string, HasName>,
  inputVar: string,
): string {
  if (isPrimitive(type) || isEnumType(type)) {
    return inputVar
  } else if (isRecordType(type)) {
    return `${className(type)}.serialize(${inputVar})`
  } else if (isArrayType(type)) {
    if (isUnion(type.items)) {
      return `${inputVar}.map((e) => {
        return ${generateAssignmentValue(type.items, fqns, mapping, 'e')}
      })`
    }
    return `${inputVar}.map((e) => ${generateAssignmentValue(type.items, fqns, mapping, 'e')})`
  } else if (isUnion(type)) {
    const hasNull = type.indexOf('null' as any) >= 0
    const withoutNull = type.filter((t) => (t as any) !== 'null')
    let conditions = withoutNull.map((t) => generateCondition(t, fqns, mapping, inputVar))
    let values = withoutNull.map((t) => generateUnionWrapper(t, fqns, mapping, inputVar))
    if (hasNull) {
      conditions = [`${inputVar} === null`].concat(conditions)
      values = [`return null`].concat(values)
    }
    let branches = conditions.map((c, i) => [c, values[i]] as [string, string])
    const elseBranch = `throw new TypeError('Unserializable type!')`
    return asSelfExecuting(joinConditional(branches, elseBranch))
  } else if (isMapType(type)) {
    const mapParsingStatements = `const keys = Object.keys(${inputVar});
    const output: any = {};
    for(let i = 0; i < keys.length; i +=1 ) {
      const mapKey = keys[i];
      const mapValue = ${inputVar}[mapKey];
      output[mapKey] = ${generateAssignmentValue(type.values, fqns, mapping, 'mapValue')};
    }
    return output;`
    return asSelfExecuting(mapParsingStatements)
  } else if (typeof type === 'string') {
    return generateAssignmentValue(resolveReference(type, fqns, mapping), fqns, mapping, inputVar)
  } else {
    throw new TypeError(`not ready for type ${type}`)
  }
}

function generateFieldAssginment(field: Field, fqns: FqnResolver, mapping: Map<string, HasName>): string {
  return `${field.name}: ${generateAssignmentValue(field.type, fqns, mapping, `input.${field.name}`)}`
}

export function generateSerialize(type: RecordType, fqns: FqnResolver, mapping: Map<string, HasName>): string {
  const name = type.name
  return `public static serialize(input: ${name}): object {
    return {
      ${type.fields.map((field) => generateFieldAssginment(field, fqns, mapping))}
    }
  }`
}
