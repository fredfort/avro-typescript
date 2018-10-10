import {
  RecordType,
  Field,
  isEnumType,
  isRecordType,
  isArrayType,
  isUnion,
  isMapType,
  isPrimitive,
  ITypeProvider,
} from '../model'
import {
  avroWrapperName,
  qEnumName,
  qAvroWrapperName,
  fqnConstantName,
  qualifiedName,
  enumName,
  className,
} from './utils'
import { generatePrimitive } from './generateFieldType'

function getTypeKey(type: any, context: ITypeProvider): string {
  if (isPrimitive(type)) {
    return type
  } else if (isEnumType(type)) {
    return context.getOptions().namespaces ? qualifiedName(type, enumName) : `[${fqnConstantName(type)}]`
  } else if (isRecordType(type)) {
    return context.getOptions().namespaces ? qualifiedName(type, className) : `[${fqnConstantName(type)}]`
  } else if (isArrayType(type) || isMapType(type)) {
    return type.type
  }
  throw new TypeError(`Unknown type`)
}

function quoteTypeKey(key: string): string {
  if (key.indexOf('.') >= 0) {
    return `'${key}'`
  }
  return key
}

export function generateAvroWrapperFieldType(type: any, context: ITypeProvider): string {
  if (isPrimitive(type)) {
    return generatePrimitive(type)
  } else if (isEnumType(type)) {
    return qEnumName(type, context)
  } else if (isRecordType(type)) {
    return qAvroWrapperName(type, context)
  } else if (isArrayType(type)) {
    const itemsType = generateAvroWrapperFieldType(type.items, context)
    return isUnion(type.items) && type.items.length > 1 ? `(${itemsType})[]` : `${itemsType}[]`
  } else if (isUnion(type)) {
    const withoutNull = type.filter((t) => (t as any) !== 'null')
    const hasNull = withoutNull.length !== type.length
    const fields = withoutNull
      .map((t) => `${quoteTypeKey(getTypeKey(t, context))}?: ${generateAvroWrapperFieldType(t, context)}`)
      .join(',\n')
    return `{
      ${fields}
    }${hasNull ? '| null' : ''}`
  } else if (isMapType(type)) {
    return `{ [index:string]:${generateAvroWrapperFieldType(type.values, context)} }`
  } else {
    throw new TypeError(`not ready for type ${type}`)
  }
}

function generateFieldDeclaration(field: Field, context: ITypeProvider): string {
  return `${field.name}: ${generateAvroWrapperFieldType(field.type, context)}`
}

export function generateAvroWrapper(type: RecordType, context: ITypeProvider): string {
  return `export interface ${avroWrapperName(type)} {
    ${type.fields.map((field) => generateFieldDeclaration(field, context)).join('\n')}
  }`
}
