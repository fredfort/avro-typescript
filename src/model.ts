/**** Contains the Interfaces and Type Guards for Avro schema */
export interface Options {
  convertEnumToType?: boolean
  removeNameSpace?: boolean
}

const PRIMITIVE_TYPES = ['string', 'boolean', 'long', 'int', 'double', 'float', 'bytes', 'null']
const NUMBER_TYPES = ['long', 'int', 'double', 'float']

export type Type = NameOrType | NameOrType[]
export type NameOrType = TypeNames | RecordType | ArrayType | NamedType
export type TypeNames = 'record' | 'array' | 'null' | 'map' | string

export interface HasName extends BaseType {
  name: string
  namespace: string
}

export interface Field {
  name: string
  type: Type
  default?: string | number | null | boolean
}

export interface BaseType {
  type: TypeNames
}

export interface RecordType extends BaseType, HasName {
  type: 'record'
  name: string
  fields: Field[]
}

export interface ArrayType extends BaseType {
  type: 'array'
  items: Type
}

export interface MapType extends BaseType {
  type: 'map'
  values: Type
}

export interface EnumType extends BaseType, HasName {
  type: 'enum'
  name: string
  symbols: string[]
}

export interface NumberType extends BaseType {
  type: 'long' | 'int' | 'double' | 'float'
}

export interface NamedType extends BaseType {
  type: string
}

export function isRecordType(type: BaseType): type is RecordType {
  return type.type === 'record'
}

export function isArrayType(type: BaseType): type is ArrayType {
  return type.type === 'array'
}

export function isMapType(type: BaseType): type is MapType {
  return type.type === 'map'
}

export function isEnumType(type: BaseType): type is EnumType {
  return type.type === 'enum'
}

export function isUnion(type: Type): type is NamedType[] {
  return type instanceof Array
}

export function isNumberType(type: BaseType): type is NumberType {
  return NUMBER_TYPES.indexOf(type.type) >= 0
}

export function isPrimitive(type: Type): boolean {
  return PRIMITIVE_TYPES.indexOf(type as string) >= 0
}

export function isOptional(type: Type): boolean {
  if (isUnion(type)) {
    const t1 = type[0]
    if (typeof t1 === 'string') {
      return t1 === 'null'
    }
  }
}
