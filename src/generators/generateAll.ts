import { HasName, RecordType, isRecordType, isUnion, isArrayType, isMapType, isEnumType, EnumType } from '../model'
import { generateEnumType } from './generateEnum'
import { generateClass } from './generateClass'
import { generateInterface } from './generateInterface'
import { FqnResolver } from './FqnResolver'
import { addNamespaces } from './addNamespaces'
import { qualifiedName } from './utils'
import { GeneratorContext } from './typings'

function getNameToTypeMapping(types: HasName[]): Map<string, RecordType> {
  return new Map(types.map((type) => [qualifiedName(type), type] as [string, RecordType]))
}

function alphaComparator(a: HasName, b: HasName) {
  if (a.name < b.name) {
    return -1
  } else if (a.name > b.name) {
    return 1
  }
  return 0
}

function getAllRecordTypes(type: any, types: RecordType[]): RecordType[] {
  if (isRecordType(type)) {
    types.push(type)
    type.fields.forEach((field) => getAllRecordTypes(field.type, types))
  } else if (isUnion(type)) {
    type.forEach((optionType) => getAllRecordTypes(optionType, types))
  } else if (isArrayType(type)) {
    getAllRecordTypes(type.items, types)
  } else if (isMapType(type)) {
    getAllRecordTypes(type.values, types)
  }
  return types
}

export function getAllEnumTypes(type: any, types: EnumType[]): EnumType[] {
  if (isEnumType(type)) {
    types.push(type)
  } else if (isUnion(type)) {
    type.forEach((optionType) => getAllEnumTypes(optionType, types))
  } else if (isRecordType(type)) {
    type.fields.forEach((field) => getAllEnumTypes(field.type, types))
  } else if (isArrayType(type)) {
    getAllEnumTypes(type.items, types)
  } else if (isMapType(type)) {
    getAllEnumTypes(type.values, types)
  }
  return types
}

export function generateAll(record: RecordType): string {
  const context: GeneratorContext = {
    fqnResolver: new FqnResolver(),
    nameToTypeMapping: new Map(),
  }
  const type = addNamespaces(record, context)
  const enumTypes = getAllEnumTypes(type, []).sort(alphaComparator)
  const recordTypes = getAllRecordTypes(type, []).sort(alphaComparator)
  context.nameToTypeMapping = getNameToTypeMapping([].concat(enumTypes, recordTypes))

  const enums = enumTypes.map(generateEnumType)
  const interfaces = recordTypes.map((t) => generateInterface(t, context))
  const classes = recordTypes.map((t) => generateClass(t, context))
  return []
    .concat(enums)
    .concat(interfaces)
    .concat(classes)
    .join('\n')
}
