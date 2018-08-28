import { interfaceName, resolveReference } from './utils'
import { HasName, isRecordType, isPrimitive, isEnumType, isArrayType, isMapType } from '../model'
import { FqnResolver } from './FqnResolver'

function generatePrimitive(avroType: string): string {
  switch (avroType) {
    case 'long':
    case 'int':
    case 'double':
    case 'float':
      return 'number'
    case 'bytes':
      return 'Buffer'
    case 'null':
      return 'null'
    case 'boolean':
      return 'boolean'
    case 'string':
      return 'string'
    default:
      throw new TypeError(`Unknown primitive type: ${avroType}`)
  }
}

export function generateFieldType(type: any, fqns: FqnResolver, mapping: Map<string, HasName>): string {
  if (isPrimitive(type)) {
    return generatePrimitive(type)
  } else if (typeof type === 'string') {
    return generateFieldType(resolveReference(type, fqns, mapping), fqns, mapping)
  } else if (type instanceof Array) {
    return type.map((tpe) => generateFieldType(tpe, fqns, mapping)).join(' | ')
  } else if (isRecordType(type)) {
    return interfaceName(type)
  } else if (isEnumType(type)) {
    return type.name
  } else if (isArrayType(type)) {
    if ([].concat(type.items).length === 1) {
      return `${generateFieldType(type.items, fqns, mapping)}[]`
    }
    return `(${generateFieldType(type.items, fqns, mapping)})[]`
  } else if (isMapType(type)) {
    return `{ [index:string]:${generateFieldType(type.values, fqns, mapping)} }`
  }
  throw new TypeError(`Unknown type ${type}!`)
}
