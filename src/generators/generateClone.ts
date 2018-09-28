import {
  RecordType,
  isEnumType,
  isRecordType,
  isArrayType,
  isUnion,
  isPrimitive,
  isMapType,
  Field,
  TypeVariant,
  ArrayType,
  ITypeProvider,
} from '../model'
import { generateCondition } from './generateSerialize'
import { className, qClassName, joinConditional, asSelfExecuting, cloneName, interfaceName, qCloneName } from './utils'
import { generateFieldType } from './generateFieldType'

// Handling the case when cloning an array of record type. This saves extra function creations
function generateArrayClone(type: ArrayType, context: ITypeProvider, inputVar: string): string {
  let items = type.items as any
  if (isUnion(items)) {
    return `${inputVar}.map((e) => {
      return ${generateAssignmentValue(items, context, 'e')}
    })`
  }
  if (isRecordType(items) && context.getOptions().types === TypeVariant.INTERFACES_ONLY) {
    return `${inputVar}.map(${qCloneName(items, context)})`
  }
  return `${inputVar}.map((e) => ${generateAssignmentValue(type.items, context, 'e')})`
}

function generateAssignmentValue(type: any, context: ITypeProvider, inputVar: string): string {
  if (isPrimitive(type) || isEnumType(type)) {
    return inputVar
  } else if (isRecordType(type)) {
    switch (context.getOptions().types) {
      case TypeVariant.CLASSES:
        return `${qClassName(type, context)}.clone(${inputVar})`
      case TypeVariant.INTERFACES_ONLY:
        return `${qCloneName(type, context)}(${inputVar})`
    }
    return
  } else if (isArrayType(type)) {
    return generateArrayClone(type, context, inputVar)
  } else if (isUnion(type)) {
    const hasNull = type.indexOf('null' as any) >= 0
    const withoutNull = type.filter((t) => (t as any) !== 'null')
    let conditions = withoutNull.map((t) => generateCondition(t, context, inputVar))
    let values = withoutNull.map((t) => `return ${generateAssignmentValue(t, context, inputVar)}`)
    if (hasNull) {
      conditions = [`${inputVar} === null`].concat(conditions)
      values = [`return null`].concat(values)
    }
    let branches = conditions.map((c, i) => [c, values[i]] as [string, string])
    const block = `${joinConditional(branches)}
    throw new TypeError('Unrecognizable type!')`
    return asSelfExecuting(block)
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
  } else {
    throw new TypeError(`not ready for type ${type}`)
  }
}

function generateFieldAssginment(field: Field, context: ITypeProvider): string {
  return `${field.name}: ${generateAssignmentValue(field.type, context, `input.${field.name}`)}`
}

function generateStaticClassMethod(type: RecordType, context: ITypeProvider): string {
  return `public static clone(input: ${className(type)}): ${className(type)} {
    return new ${className(type)}({
      ${type.fields.map((field) => generateFieldAssginment(field, context)).join(',\n')}
    })
  }`
}

function generateStandaloneMethod(type: RecordType, context: ITypeProvider): string {
  return `export function ${cloneName(type)}(input: ${interfaceName(type)}): ${interfaceName(type)} {
    return {
      ${type.fields.map((field) => generateFieldAssginment(field, context)).join(',\n')}
    }
  }`
}

export function generateClone(type: RecordType, context: ITypeProvider): string {
  switch (context.getOptions().types) {
    case TypeVariant.CLASSES:
      return generateStaticClassMethod(type, context)
    case TypeVariant.INTERFACES_ONLY:
      return generateStandaloneMethod(type, context)
  }
}
