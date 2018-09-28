/**** Contains the Interfaces and Type Guards for Avro schema */
export const enum EnumVariant {
  ENUM = 'enum',
  CONST_ENUM = 'const-enum',
  STRING = 'string',
}
export const enum TypeVariant {
  CLASSES = 'classes',
  INTERFACES_ONLY = 'interfaces-only',
}
export interface Options {
  enums: EnumVariant
  types: TypeVariant
  namespaces: boolean
  duplicateTypeResolutionStrategy: DuplicateTypeResolutionStrategy
}

export const enum SubCommand {
  GENERATE = 'gen',
  DIAGNOSE = 'diagnose',
}

export const enum DuplicateTypeResolutionStrategy {
  BEST_EFFORT = 'best-effort',
  FAIL = 'fail',
}

export interface CommandLineArgs extends Options {
  files: string[]
  command: SubCommand
}

const PRIMITIVE_TYPES = ['string', 'boolean', 'long', 'int', 'double', 'float', 'bytes', 'null']
const NUMBER_TYPES = ['long', 'int', 'double', 'float']

export type TypeOrRef = NameOrType | NameOrType[]
export type NameOrType = TypeNames | RecordType | ArrayType | TypeObject
export type TypeNames = 'record' | 'array' | 'null' | 'map' | string

export interface NamedType extends BaseType {
  name: string
  namespace: string
}

export interface Field {
  name: string
  type: TypeOrRef
  default?: string | number | null | boolean
}

export interface BaseType {
  type: TypeNames
}

export interface RecordType extends BaseType, NamedType {
  type: 'record'
  name: string
  fields: Field[]
}

export interface ArrayType extends BaseType {
  type: 'array'
  items: TypeOrRef
}

export interface MapType extends BaseType {
  type: 'map'
  values: TypeOrRef
}

export interface EnumType extends BaseType, NamedType {
  type: 'enum'
  name: string
  symbols: string[]
}

export const enum Similarity {
  FIELD_COUNT = 'FIELD_COUNT',
  NUMERIC = 'NUMERIC',
}

export interface ICompilationUnit {
  filename: string
  rootType: RecordType
}

export interface ITypeProvider {
  getOptions(): Options
  getRecordTypes(): RecordType[]
  getEnumTypes(): EnumType[]
  getNamedTypes(): NamedType[]
  getNamespaces(): string[]
  getEnumTypesInNamespace(namespace: string): EnumType[]
  getRecordTypesInNamespace(namespace: string): RecordType[]
  getNamedTypesInNamespace(namespace: string): NamedType[]
}

export interface IRootContext extends ITypeProvider {
  getCompilationUnits(): ICompilationUnit[]
  getTypeContexts(): ITypeContext[]
}

export interface ITypeContext extends ITypeProvider {
  getCompilationUnit(): ICompilationUnit
}

export interface TypeSimilarityDiagnostic {
  alternatives: string[]
  typeName: string
  fieldName: string
  similarity: Similarity
}

export interface NumberType extends BaseType {
  type: 'long' | 'int' | 'double' | 'float'
}

export interface TypeObject extends BaseType {
  type: string
}

export function isRecordType(type: any): type is RecordType {
  return type instanceof Object && type.type === 'record'
}

export function isArrayType(type: any): type is ArrayType {
  return type instanceof Object && type.type === 'array'
}

export function isMapType(type: any): type is MapType {
  return type instanceof Object && type.type === 'map'
}

export function isEnumType(type: any): type is EnumType {
  return type instanceof Object && type.type === 'enum'
}

export function isUnion(type: any): type is TypeOrRef[] {
  return type instanceof Array
}

export function isNumberType(type: BaseType): type is NumberType {
  return NUMBER_TYPES.indexOf(type.type) >= 0
}

export function isPrimitive(type: TypeOrRef): boolean {
  return PRIMITIVE_TYPES.indexOf(type as string) >= 0
}

export function isNumericType(type: TypeOrRef): boolean {
  return NUMBER_TYPES.indexOf(type as string) >= 0
}

export function isOptional(type: TypeOrRef): boolean {
  if (isUnion(type)) {
    const t1 = type[0]
    if (typeof t1 === 'string') {
      return t1 === 'null'
    }
  }
}

export const DEFAULT_OPTIONS: Options = {
  enums: EnumVariant.STRING,
  types: TypeVariant.INTERFACES_ONLY,
  namespaces: false,
  duplicateTypeResolutionStrategy: DuplicateTypeResolutionStrategy.BEST_EFFORT,
}

export function getOptions(opts: Partial<Options>): Options {
  return { ...DEFAULT_OPTIONS, ...opts }
}
