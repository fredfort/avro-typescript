import {
  HasName,
  RecordType,
  isRecordType,
  isUnion,
  isArrayType,
  isMapType,
  isEnumType,
  EnumType,
  Options,
} from '../model'
import { FqnResolver } from './FqnResolver'
import { addNamespaces } from './addNamespaces'
import { qualifiedName, collectNamespaces, groupByNamespace } from './utils'
import { GeneratorContext } from './typings'
import { generateContent } from './generateContent'
import { generateNamespace } from './generateNamespace'

function getNameToTypeMapping(types: HasName[]): Map<string, RecordType> {
  return new Map(types.map((type) => [qualifiedName(type), type] as [string, RecordType]))
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

export function generateAll(record: RecordType, options: Options): string {
  const context: GeneratorContext = {
    options,
    fqnResolver: new FqnResolver(),
    nameToTypeMapping: new Map(),
  }
  const type = addNamespaces(record, context)
  const enumTypes = getAllEnumTypes(type, [])
  const recordTypes = getAllRecordTypes(type, [])
  const allNamedTypes: HasName[] = [].concat(enumTypes, recordTypes)
  context.nameToTypeMapping = getNameToTypeMapping(allNamedTypes)

  if (options.removeNameSpace) {
    return generateContent(recordTypes, enumTypes, context)
  } else {
    const namespaces = Array.from(collectNamespaces(allNamedTypes))
    const recordsGrouped = groupByNamespace(recordTypes)
    const enumsGrouped = groupByNamespace(enumTypes)
    const namespaceTypes: [string, RecordType[], EnumType[]][] = namespaces.map(
      (ns) => [ns, recordsGrouped.get(ns) || [], enumsGrouped.get(ns) || []] as [string, RecordType[], EnumType[]],
    )
    return namespaceTypes.map(([ns, records, enums]) => generateNamespace(ns, records, enums, context)).join('\n')
  }
}
