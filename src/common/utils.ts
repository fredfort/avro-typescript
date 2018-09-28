import {
  NamedType,
  TypeOrRef,
  RecordType,
  isArrayType,
  isMapType,
  isUnion,
  isPrimitive,
  isRecordType,
  isEnumType,
  EnumType,
  NameOrType,
} from '../model'

export function setsEqual<T>(set1: Set<T>, set2: Set<T>): boolean {
  if (set1.size !== set2.size) return false
  for (var e of set1) {
    if (!set2.has(e)) {
      return false
    }
  }
  return true
}

export function alphaComparator(a: string, b: string) {
  if (a < b) {
    return -1
  } else if (a > b) {
    return 1
  }
  return 0
}

export function nameComparator(a: NamedType, b: NamedType) {
  return alphaComparator(a.name, b.name)
}

export function collectRecordTypes(type: TypeOrRef, accumulatedTypes: RecordType[], visited: any[] = []): void {
  if (accumulatedTypes.indexOf(type as any) >= 0) {
    return
  }
  visited.push(type)
  if (isRecordType(type)) {
    accumulatedTypes.push(type)
    type.fields.forEach((field) => collectRecordTypes(field.type, accumulatedTypes, visited))
  } else if (isUnion(type)) {
    type.forEach((optionType) => collectRecordTypes(optionType, accumulatedTypes, visited))
  } else if (isArrayType(type)) {
    collectRecordTypes(type.items, accumulatedTypes, visited)
  } else if (isMapType(type)) {
    collectRecordTypes(type.values, accumulatedTypes, visited)
  }
}

export function collectEnumTypes(type: TypeOrRef, accumulatedTypes: EnumType[], visited: any[] = []): void {
  if (visited.indexOf(type as any) >= 0) {
    return
  }
  visited.push(type)
  if (isEnumType(type)) {
    accumulatedTypes.push(type)
  } else if (isUnion(type)) {
    type.forEach((optionType) => collectEnumTypes(optionType, accumulatedTypes, visited))
  } else if (isRecordType(type)) {
    type.fields.forEach((field) => collectEnumTypes(field.type, accumulatedTypes, visited))
  } else if (isArrayType(type)) {
    collectEnumTypes(type.items, accumulatedTypes, visited)
  } else if (isMapType(type)) {
    collectEnumTypes(type.values, accumulatedTypes, visited)
  }
}

type LocalReplacer = (t: NameOrType) => void
type TypeReplacer = (s: string) => NameOrType

function replaceRefsHelper(type: TypeOrRef, replaceLocal: LocalReplacer, replacer: TypeReplacer): void {
  if (typeof type === 'string' && !isPrimitive(type)) {
    const newType = replacer(type)
    replaceLocal(newType)
  } else if (isUnion(type) || isArrayType(type) || isMapType(type)) {
    replaceReferences(type, replacer)
  }
}

export function replaceReferences(type: TypeOrRef, replacer: (typeName: string) => NameOrType): void {
  if (isUnion(type)) {
    type.forEach((optionType, i) => {
      replaceRefsHelper(optionType, (newValue) => (type[i] = newValue), replacer)
    })
  } else if (isRecordType(type)) {
    type.fields.forEach((field) => {
      replaceRefsHelper(field.type, (newValue) => (field.type = newValue), replacer)
    })
  } else if (isArrayType(type)) {
    replaceRefsHelper(type.items, (newValue) => (type.items = newValue), replacer)
  } else if (isMapType(type)) {
    replaceRefsHelper(type.values, (newValue) => (type.values = newValue), replacer)
  }
}

export function fqn(type: NamedType): string {
  return `${type.namespace}.${type.name}`
}
