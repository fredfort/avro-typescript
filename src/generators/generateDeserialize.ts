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
  ITypeProvider,
} from '../model'
import {
  getTypeName,
  asSelfExecuting,
  joinConditional,
  className,
  qClassName,
  avroWrapperName,
  fqnConstantName,
  qualifiedName,
  deserialiserName,
  interfaceName,
  qDeserialiserName,
} from './utils'
import { generateFieldType } from './generateFieldType'

function getKey(t: any, context: ITypeProvider) {
  if (isEnumType(t) || isRecordType(t)) {
    return context.getOptions().namespaces ? `'${qualifiedName(t)}'` : fqnConstantName(t)
  } else {
    return `'${getTypeName(t)}'`
  }
}

// Handling the case when cloning an array of record type. This saves extra function creations
function generateArrayDeserialize(type: ArrayType, context: ITypeProvider, inputVar: string): string {
  let items = type.items as any
  if (isUnion(items)) {
    return `${inputVar}.map((e) => {
      return ${generateAssignmentValue(items, context, 'e')}
    })`
  }
  if (isRecordType(items) && context.getOptions().types === TypeVariant.INTERFACES_ONLY) {
    return `${inputVar}.map(${qDeserialiserName(items, context)})`
  }
  return `${inputVar}.map((e) => ${generateAssignmentValue(items, context, 'e')})`
}

function generateAssignmentValue(type: any, context: ITypeProvider, inputVar: string) {
  if ((typeof type === 'string' && isPrimitive(type)) || isEnumType(type)) {
    return `${inputVar}`
  } else if (isRecordType(type)) {
    switch (context.getOptions().types) {
      case TypeVariant.CLASSES:
        return `${qClassName(type, context)}.deserialize(${inputVar})`
      case TypeVariant.INTERFACES_ONLY:
        return `${qDeserialiserName(type, context)}(${inputVar})`
    }
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

function generateDeserializeFieldAssignment(field: Field, context: ITypeProvider): string {
  return `${field.name}: ${generateAssignmentValue(field.type, context, `input.${field.name}`)},`
}

function generateStaticClassMethod(type: RecordType, context: ITypeProvider): string {
  return `public static deserialize(input: ${avroWrapperName(type)}): ${className(type)} {
    return new ${className(type)}({
      ${type.fields.map((f) => generateDeserializeFieldAssignment(f, context)).join('\n')}
    })
  }`
}

function generateStandaloneMethod(type: RecordType, context: ITypeProvider): string {
  return `export function ${deserialiserName(type)}(input: ${avroWrapperName(type)}): ${interfaceName(type)} {
    return {
      ${type.fields.map((field) => generateDeserializeFieldAssignment(field, context)).join('\n')}
    }
  }`
}

export function generateDeserialize(type: RecordType, context: ITypeProvider) {
  switch (context.getOptions().types) {
    case TypeVariant.CLASSES:
      return generateStaticClassMethod(type, context)
    case TypeVariant.INTERFACES_ONLY:
      return generateStandaloneMethod(type, context)
  }
}
