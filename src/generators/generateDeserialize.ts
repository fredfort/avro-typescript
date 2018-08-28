import {
  isRecordType,
  isArrayType,
  isMapType,
  Field,
  isEnumType,
  HasName,
  isUnion,
  isPrimitive,
  RecordType,
} from '../model'
import { getTypeName, asSelfExecuting, joinConditional, className, qualifiedName, resolveReference } from './utils'
import { generateFieldType } from './generateFieldType'
import { FqnResolver } from './FqnResolver'

function getKey(t: any, fqns: FqnResolver) {
  if (isRecordType(t)) {
    return `${className(t)}.FQN`
  } else if (isEnumType(t)) {
    return `'${qualifiedName(t)}'`
  } else {
    return `'${getTypeName(t, fqns)}'`
  }
}

function generateAssignmentValue(type: any, fqns: FqnResolver, mapping: Map<string, HasName>, inputVar: string) {
  if ((typeof type === 'string' && isPrimitive(type)) || isEnumType(type)) {
    return `${inputVar}`
  } else if (isRecordType(type)) {
    return `${className(type)}.deserialize(${inputVar})`
  } else if (typeof type === 'string') {
    return generateAssignmentValue(resolveReference(type, fqns, mapping), fqns, mapping, inputVar)
  } else if (isArrayType(type)) {
    if (isUnion(type.items)) {
      return `${inputVar}.map((e) => {
        return ${generateAssignmentValue(type.items, fqns, mapping, 'e')}
      })`
    }
    return `${inputVar}.map((e) => ${generateAssignmentValue(type.items, fqns, mapping, 'e')})`
  } else if (isUnion(type)) {
    const nonNullTypes = type.filter((t) => (t as any) !== 'null')
    const hasNull = nonNullTypes.length !== type.length
    let conditions: string[] = null
    let branches: string[] = null

    conditions = nonNullTypes.map((t) => `${inputVar}[${getKey(t, fqns)}] !== undefined`)
    branches = nonNullTypes.map(
      (t) => `return ${generateAssignmentValue(t, fqns, mapping, `${inputVar}[${getKey(t, fqns)}]`)}`,
    )
    if (hasNull) {
      conditions = [`${inputVar} === null`].concat(conditions)
      branches = [`return null`].concat(branches)
    }
    const elseBranch = `throw new TypeError('Unresolvable type');`
    const branchesAsTuples = conditions.map((c, i) => [c, branches[i]] as [string, string])
    const ifElseStatement = joinConditional(branchesAsTuples, elseBranch)
    return asSelfExecuting(ifElseStatement)
  } else if (isMapType(type)) {
    const mapParsingStatements = `const keys = Object.keys(${inputVar});
    const output: ${generateFieldType(type, fqns, mapping)} = {};
    for(let i = 0; i < keys.length; i +=1 ) {
      const mapKey = keys[i];
      const mapValue = ${inputVar}[mapKey];
      output[mapKey] = ${generateAssignmentValue(type.values, fqns, mapping, 'mapValue')};
    }
    return output;`
    return asSelfExecuting(mapParsingStatements)
  }
  return 'null'
}

function generateDeserializeFieldAssignment(field: Field, fqns: FqnResolver, mapping: Map<string, HasName>): string {
  return `${field.name}: ${generateAssignmentValue(field.type, fqns, mapping, `input.${field.name}`)},`
}

export function generateDeserialize(type: RecordType, fqns: FqnResolver, mapping: Map<string, HasName>) {
  return `public static deserialize(input: any): ${className(type)} {
    return new ${className(type)}({
      ${type.fields.map((f) => generateDeserializeFieldAssignment(f, fqns, mapping)).join('\n')}
    })
  }`
}
