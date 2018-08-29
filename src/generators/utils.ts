import { RecordType, isPrimitive, isArrayType, isMapType, isEnumType, isRecordType, HasName } from '../model'
import { FqnResolver } from './FqnResolver'

export function interfaceName(type: RecordType) {
  return `I${type.name}`
}

export function className(type: RecordType) {
  return type.name
}

export function qualifiedName(type: HasName) {
  return type.namespace ? `${type.namespace}.${type.name}` : type.name
}

export function resolveReference(ref: string, fqns: FqnResolver, mapping: Map<string, HasName>): HasName {
  const fqn = fqns.get(ref)
  return mapping.get(fqn)
}

export function asSelfExecuting(code: string): string {
  return `(() => {
    ${code}
  })()`
}

export function joinConditional(branches: [string, string][], elseBranch?: string): string {
  if (branches.length === 0) {
    return ''
  }
  const [[firstCond, firstBranch], ...restOfBranches] = branches
  return `if(${firstCond}){\n${firstBranch}\n}
  ${restOfBranches.map(([cond, branch]) => `else if(${cond}){\n${branch}\n}`).join('\n')}
  ${elseBranch ? `else {\n${elseBranch}\n}` : ''}`
}

export function getTypeName(type: any, fqns: FqnResolver): string {
  if (isPrimitive(type)) {
    return type
  } else if (isArrayType(type) || isMapType(type)) {
    return type.type
  } else if (isRecordType(type) || isEnumType(type)) {
    return qualifiedName(type)
  } else if (typeof type === 'string') {
    return fqns.get(type)
  }
}
