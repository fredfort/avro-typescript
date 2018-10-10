import {
  RecordType,
  isPrimitive,
  isArrayType,
  isMapType,
  isEnumType,
  isRecordType,
  NamedType,
  EnumType,
  ITypeProvider,
} from '../model'
const constantCase = require('constant-case')

export function interfaceName(type: RecordType) {
  return `I${type.name}`
}

export function avroWrapperName(type: RecordType) {
  return `I${type.name}AvroWrapper`
}

export function className(type: RecordType) {
  return type.name
}

export function enumName(type: EnumType) {
  return type.name
}

export function typeGuardName(type: RecordType) {
  return `is${type.name}`
}

export function cloneName(type: RecordType) {
  return `clone${type.name}`
}

export function deserialiserName(type: RecordType) {
  return `deserialize${type.name}`
}

export function serialiserName(type: RecordType) {
  return `serialize${type.name}`
}

export function fqnConstantName(type: NamedType) {
  return `${constantCase(type.name)}_FQN`
}

function qualifiedNameFor<T extends NamedType>(type: T, transform: (T) => string, context: ITypeProvider) {
  if (context.getOptions().namespaces) {
    return qualifiedName(type, transform)
  }
  return transform(type)
}

export function qInterfaceName(type: RecordType, context: ITypeProvider) {
  return qualifiedNameFor(type, interfaceName, context)
}

export function qClassName(type: RecordType, context: ITypeProvider) {
  return qualifiedNameFor(type, className, context)
}

export function qEnumName(type: EnumType, context: ITypeProvider) {
  return qualifiedNameFor(type, enumName, context)
}

export function qAvroWrapperName(type: RecordType, context: ITypeProvider) {
  return qualifiedNameFor(type, avroWrapperName, context)
}

export function qTypeGuardName(type: RecordType, context: ITypeProvider) {
  return qualifiedNameFor(type, typeGuardName, context)
}

export function qCloneName(type: RecordType, context: ITypeProvider) {
  return qualifiedNameFor(type, cloneName, context)
}

export function qDeserialiserName(type: RecordType, context: ITypeProvider) {
  return qualifiedNameFor(type, deserialiserName, context)
}

export function qSerialiserName(type: RecordType, context: ITypeProvider) {
  return qualifiedNameFor(type, serialiserName, context)
}

export function qualifiedName(type: NamedType, transform: (e: NamedType) => string = (e) => e.name) {
  return type.namespace ? `${type.namespace}.${transform(type)}` : transform(type)
}

export function asSelfExecuting(code: string): string {
  return `(() => {
    ${code}
  })()`
}

export function joinConditional(branches: [string, string][]): string {
  if (branches.length === 0) {
    return ''
  }
  const [[firstCond, firstBranch], ...restOfBranches] = branches
  return `if(${firstCond}){\n${firstBranch}\n}
  ${restOfBranches.map(([cond, branch]) => `else if(${cond}){\n${branch}\n}`).join('\n')}`
}

export function getTypeName(type: any): string {
  if (isPrimitive(type)) {
    return type
  } else if (isArrayType(type) || isMapType(type)) {
    return type.type
  } else if (isRecordType(type) || isEnumType(type)) {
    return qualifiedName(type)
  }
}

export function groupByNamespace<T extends NamedType>(types: T[]): Map<string, T[]> {
  const mapping = new Map<string, T[]>()
  types.forEach((type) => {
    if (!Array.isArray(mapping.get(type.namespace))) {
      mapping.set(type.namespace, [])
    }
    const array = mapping.get(type.namespace)
    array.push(type)
  })
  return mapping
}

export function collectNamespaces(types: NamedType[]): Set<string> {
  const ns = new Set<string>()
  types.forEach(({ namespace }) => ns.add(namespace))
  return ns
}
