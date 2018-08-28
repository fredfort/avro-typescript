import { isArrayType, isMapType, isPrimitive, isUnion, isEnumType, isRecordType, RecordType } from '../model'
import { FqnResolver } from './FqnResolver'

function augmentRecordsAndEnums(type: any, namespace: string, fqns: FqnResolver): void {
  if (isUnion(type)) {
    type.forEach((tp) => augmentRecordsAndEnums(tp, namespace, fqns))
  } else if (isEnumType(type)) {
    type.namespace = type.namespace || namespace
    fqns.add(type.namespace, type.name)
  } else if (isRecordType(type)) {
    type.namespace = type.namespace || namespace
    fqns.add(type.namespace, type.name)
    type.fields.forEach((field) => augmentRecordsAndEnums(field.type, type.namespace, fqns))
  } else if (isArrayType(type)) {
    augmentRecordsAndEnums(type.items, namespace, fqns)
  } else if (isMapType(type)) {
    augmentRecordsAndEnums(type.values, namespace, fqns)
  }
}

function augmentReferences(type: any, fqns: FqnResolver): void {
  if (isUnion(type)) {
    type.forEach((optionType, i) => {
      if (typeof optionType === 'string' && !isPrimitive(optionType)) {
        type[i] = fqns.get(optionType as string) as any
      } else {
        augmentReferences(optionType, fqns)
      }
    })
  } else if (isRecordType(type)) {
    type.fields.forEach((field) => {
      const ft = field.type
      if (typeof ft === 'string' && !isPrimitive(ft)) {
        field.type = fqns.get(ft)
      }
    })
  } else if (isArrayType(type)) {
    augmentReferences(type.items, fqns)
  } else if (isMapType(type)) {
    augmentReferences(type.values, fqns)
  }
}

export function addNamespaces(type: RecordType, fqns: FqnResolver): RecordType {
  const cloned: RecordType = JSON.parse(JSON.stringify(type))
  augmentRecordsAndEnums(cloned, null, fqns)
  augmentReferences(cloned, fqns)
  return cloned
}
