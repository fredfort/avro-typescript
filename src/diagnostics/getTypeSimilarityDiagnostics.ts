import {
  TypeOrRef,
  isRecordType,
  RecordType,
  isUnion,
  Field,
  isNumericType,
  isArrayType,
  isMapType,
  ITypeContext,
  TypeSimilarityDiagnostic,
  Similarity,
} from '../model'
import { qClassName, qualifiedName, className } from '../generators/utils'

function setsEqual<T>(set1: Set<T>, set2: Set<T>): boolean {
  if (set1.size !== set2.size) return false
  for (var e of set1) {
    if (!set2.has(e)) {
      return false
    }
  }
  return true
}

function getFieldNames(type: TypeOrRef, context: ITypeContext): Set<string> {
  return isRecordType(type) ? new Set(type.fields.map((f) => f.name)) : null
}

function getRecordTypeDiagnostics(
  owner: RecordType,
  field: Field,
  types: TypeOrRef[],
  context: ITypeContext,
): TypeSimilarityDiagnostic[] {
  const fieldTypeNames = types
    .map((type) => [type, getFieldNames(type, context)] as [RecordType, Set<string>])
    .filter(([, names]) => names !== null)

  const similarTypes: { [typeName: string]: string[] } = {}

  for (const [outerType, outerFieldNames] of fieldTypeNames) {
    const outerName = qualifiedName(outerType, className)
    similarTypes[outerName] = []
    for (const [innerType, innerFieldNames] of fieldTypeNames) {
      if (outerType === innerType) {
        continue
      }
      if (setsEqual(outerFieldNames, innerFieldNames)) {
        const innerName = qualifiedName(innerType, className)
        if (similarTypes[innerName] && similarTypes[innerName].indexOf(outerName) >= 0) {
          continue
        }
        similarTypes[outerName].push(innerName)
      }
    }
  }

  const diagnostics: TypeSimilarityDiagnostic[] = []
  for (const type of Object.keys(similarTypes)) {
    const alternatives = similarTypes[type]
    if (alternatives.length > 0) {
      diagnostics.push({
        typeName: qualifiedName(owner, className),
        fieldName: field.name,
        alternatives: [type].concat(alternatives),
        similarity: Similarity.FIELD_COUNT,
      })
    }
  }
  return diagnostics
}

function getNumberTypeDiagnostics(
  owner: RecordType,
  field: Field,
  types: TypeOrRef[],
  context: ITypeContext,
): TypeSimilarityDiagnostic[] {
  const numberTypes = types.filter((type) => isNumericType(type)).map((type) => type as string)
  if (numberTypes.length >= 2) {
    return [
      {
        typeName: qClassName(owner, context),
        alternatives: numberTypes,
        fieldName: field.name,
        similarity: Similarity.NUMERIC,
      },
    ]
  }
  return []
}

export function getTypeSimilarityDiagnostics(types: RecordType[], context: ITypeContext): TypeSimilarityDiagnostic[] {
  const diagnostics: TypeSimilarityDiagnostic[] = []
  for (const t of types) {
    for (const f of t.fields) {
      const { type: fieldType } = f
      if (isUnion(fieldType)) {
        diagnostics.push(...getRecordTypeDiagnostics(t, f, fieldType, context))
        diagnostics.push(...getNumberTypeDiagnostics(t, f, fieldType, context))
      } else if (isArrayType(fieldType) && isUnion(fieldType.items)) {
        diagnostics.push(...getRecordTypeDiagnostics(t, f, fieldType.items, context))
        diagnostics.push(...getNumberTypeDiagnostics(t, f, fieldType.items, context))
      } else if (isMapType(fieldType) && isUnion(fieldType.values)) {
        diagnostics.push(...getRecordTypeDiagnostics(t, f, fieldType.values, context))
        diagnostics.push(...getNumberTypeDiagnostics(t, f, fieldType.values, context))
      }
    }
  }
  return diagnostics
}
