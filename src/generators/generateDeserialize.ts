import { isRecordType, isArrayType, isMapType, Field, isEnumType, isUnion, isPrimitive, RecordType } from '../model'
import {
  getTypeName,
  asSelfExecuting,
  joinConditional,
  className,
  qualifiedName,
  resolveReference,
  qClassName,
} from './utils'
import { generateFieldType } from './generateFieldType'
import { GeneratorContext } from './typings'

function getKey(t: any, context: GeneratorContext) {
  if (!isPrimitive(t) && typeof t === 'string') {
    return getKey(resolveReference(t, context), context)
  } else if (isEnumType(t) || isRecordType(t)) {
    return `'${qualifiedName(t)}'`
  } else {
    return `'${getTypeName(t, context)}'`
  }
}

function generateAssignmentValue(type: any, context: GeneratorContext, inputVar: string) {
  if ((typeof type === 'string' && isPrimitive(type)) || isEnumType(type)) {
    return `${inputVar}`
  } else if (isRecordType(type)) {
    return `${qClassName(type, context)}.deserialize(${inputVar})`
  } else if (typeof type === 'string') {
    return generateAssignmentValue(resolveReference(type, context), context, inputVar)
  } else if (isArrayType(type)) {
    if (isUnion(type.items) && type.items.length > 1) {
      return `${inputVar}.map((e: any) => {
        return ${generateAssignmentValue(type.items, context, 'e')}
      })`
    }
    return `${inputVar}.map((e: any) => ${generateAssignmentValue(type.items, context, 'e')})`
  } else if (isUnion(type)) {
    if (type.length === 1) {
      return generateAssignmentValue(type[0], context, inputVar)
    }
    const nonNullTypes = type.filter((t) => (t as any) !== 'null')
    const hasNull = nonNullTypes.length !== type.length
    let conditions: string[] = null
    let branches: string[] = null

    conditions = nonNullTypes.map((t) => `${inputVar}[${getKey(t, context)}] !== undefined`)
    branches = nonNullTypes.map(
      (t) => `return ${generateAssignmentValue(t, context, `${inputVar}[${getKey(t, context)}]`)}`,
    )
    if (hasNull) {
      conditions = [`${inputVar} === null`].concat(conditions)
      branches = [`return null`].concat(branches)
    }
    const branchesAsTuples = conditions.map((c, i) => [c, branches[i]] as [string, string])
    const block = `${joinConditional(branchesAsTuples)}
    throw new TypeError('Unresolvable type');`
    return asSelfExecuting(`${block}`)
  } else if (isMapType(type)) {
    const mapParsingStatements = `const keys = Object.keys(${inputVar});
    const output: ${generateFieldType(type, context)} = {};
    for(let i = 0; i < keys.length; i +=1 ) {
      const mapKey = keys[i];
      const mapValue = ${inputVar}[mapKey];
      output[mapKey] = ${generateAssignmentValue(type.values, context, 'mapValue')};
    }
    return output;`
    return asSelfExecuting(mapParsingStatements)
  }
  return 'null'
}

function generateDeserializeFieldAssignment(field: Field, context: GeneratorContext): string {
  return `${field.name}: ${generateAssignmentValue(field.type, context, `input.${field.name}`)},`
}

export function generateDeserialize(type: RecordType, context: GeneratorContext) {
  return `public static deserialize(input: any): ${className(type)} {
    return new ${className(type)}({
      ${type.fields.map((f) => generateDeserializeFieldAssignment(f, context)).join('\n')}
    })
  }`
}
