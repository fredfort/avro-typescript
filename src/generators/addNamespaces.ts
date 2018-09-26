import { isArrayType, isMapType, isPrimitive, isUnion, isEnumType, isRecordType, RecordType, GeneratorContext } from '../model'

function augmentRecordsAndEnums(type: any, namespace: string, context: GeneratorContext): void {
  if (isUnion(type)) {
    type.forEach((tp) => augmentRecordsAndEnums(tp, namespace, context))
  } else if (isEnumType(type)) {
    type.namespace = type.namespace || namespace
    context.fqnResolver.add(type.namespace, type.name)
  } else if (isRecordType(type)) {
    type.namespace = type.namespace || namespace
    context.fqnResolver.add(type.namespace, type.name)
    type.fields.forEach((field) => augmentRecordsAndEnums(field.type, type.namespace, context))
  } else if (isArrayType(type)) {
    augmentRecordsAndEnums(type.items, namespace, context)
  } else if (isMapType(type)) {
    augmentRecordsAndEnums(type.values, namespace, context)
  }
}

function augmentReferences(type: any, context: GeneratorContext): void {
  if (isUnion(type)) {
    type.forEach((optionType, i) => {
      if (typeof optionType === 'string' && !isPrimitive(optionType)) {
        type[i] = context.fqnResolver.get(optionType as string) as any
      } else {
        augmentReferences(optionType, context)
      }
    })
  } else if (isRecordType(type)) {
    type.fields.forEach((field) => {
      const ft = field.type
      if (typeof ft === 'string' && !isPrimitive(ft)) {
        field.type = context.fqnResolver.get(ft)
      }
    })
  } else if (isArrayType(type)) {
    augmentReferences(type.items, context)
  } else if (isMapType(type)) {
    augmentReferences(type.values, context)
  }
}

export function addNamespaces(type: RecordType, context: GeneratorContext): RecordType {
  const cloned: RecordType = JSON.parse(JSON.stringify(type))
  augmentRecordsAndEnums(cloned, null, context)
  augmentReferences(cloned, context)
  return cloned
}
