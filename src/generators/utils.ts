import { RecordType, isPrimitive, isArrayType, isMapType, isEnumType, isRecordType, HasName } from '../model'
import { GeneratorContext } from './typings'

export function interfaceName(type: RecordType) {
  return `I${type.name}`
}

export function className(type: RecordType) {
  return type.name
}

export function qualifiedName(type: HasName) {
  return type.namespace ? `${type.namespace}.${type.name}` : type.name
}

export function resolveReference(ref: string, context: GeneratorContext): HasName {
  const fqn = context.fqnResolver.get(ref)
  return context.nameToTypeMapping.get(fqn)
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

export function getTypeName(type: any, context: GeneratorContext): string {
  if (isPrimitive(type)) {
    return type
  } else if (isArrayType(type) || isMapType(type)) {
    return type.type
  } else if (isRecordType(type) || isEnumType(type)) {
    return qualifiedName(type)
  } else if (typeof type === 'string') {
    return context.fqnResolver.get(type)
  }
}
