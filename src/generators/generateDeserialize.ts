import {
  isRecordType,
  isArrayType,
  isMapType,
  Field,
  isEnumType,
  isUnion,
  isPrimitive,
  RecordType,
  TypeVariant,
  ArrayType,
  GeneratorContext,
} from '../model'
import {
  getTypeName,
  asSelfExecuting,
  joinConditional,
  className,
  resolveReference,
  qClassName,
  avroWrapperName,
  fqnConstantName,
  qualifiedName,
  deserialiserName,
  interfaceName,
  qDeserialiserName,
} from './utils'
import { generateFieldType } from './generateFieldType'

function getKey(t: any, context: GeneratorContext) {
  if (!isPrimitive(t) && typeof t === 'string') {
    return getKey(resolveReference(t, context), context)
  } else if (isEnumType(t) || isRecordType(t)) {
    return context.options.namespaces ? `'${qualifiedName(t)}'` : fqnConstantName(t)
  } else {
    return `'${getTypeName(t, context)}'`
  }
}

// Handling the case when cloning an array of record type. This saves extra function creations
function generateArrayDeserialize(type: ArrayType, context: GeneratorContext, inputVar: string): string {
  let items = type.items as any
  if (isUnion(items)) {
    return `${inputVar}.map((e) => {
      return ${generateAssignmentValue(items, context, 'e')}
    })`
  }
  if (typeof items === 'string') {
    items = resolveReference(items, context)
  }
  if (isRecordType(items) && context.options.types === TypeVariant.INTERFACES_ONLY) {
    return `${inputVar}.map(${qDeserialiserName(items, context)})`
  }
  return `${inputVar}.map((e) => ${generateAssignmentValue(items, context, 'e')})`
}

function generateAssignmentValue(type: any, context: GeneratorContext, inputVar: string) {
  if ((typeof type === 'string' && isPrimitive(type)) || isEnumType(type)) {
    return `${inputVar}`
  } else if (isRecordType(type)) {
    switch (context.options.types) {
      case TypeVariant.CLASSES:
        return `${qClassName(type, context)}.deserialize(${inputVar})`
      case TypeVariant.INTERFACES_ONLY:
        return `${qDeserialiserName(type, context)}(${inputVar})`
    }
  } else if (typeof type === 'string') {
    return generateAssignmentValue(resolveReference(type, context), context, inputVar)
  } else if (isArrayType(type)) {
    return generateArrayDeserialize(type, context, inputVar)
  } else if (isUnion(type)) {
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

function generateStaticClassMethod(type: RecordType, context: GeneratorContext): string {
  return `public static deserialize(input: ${avroWrapperName(type)}): ${className(type)} {
    return new ${className(type)}({
      ${type.fields.map((f) => generateDeserializeFieldAssignment(f, context)).join('\n')}
    })
  }`
}

function generateStandaloneMethod(type: RecordType, context: GeneratorContext): string {
  return `export function ${deserialiserName(type)}(input: ${avroWrapperName(type)}): ${interfaceName(type)} {
    return {
      ${type.fields.map((field) => generateDeserializeFieldAssignment(field, context)).join('\n')}
    }
  }`
}

export function generateDeserialize(type: RecordType, context: GeneratorContext) {
  switch (context.options.types) {
    case TypeVariant.CLASSES:
      return generateStaticClassMethod(type, context)
    case TypeVariant.INTERFACES_ONLY:
      return generateStandaloneMethod(type, context)
  }
}
