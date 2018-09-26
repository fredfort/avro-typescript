import { RecordType, EnumType, GeneratorContext } from '../model'
import { generateContent } from './generateContent'

export function generateNamespace(
  namespace: string,
  records: RecordType[],
  enums: EnumType[],
  context: GeneratorContext,
): string {
  if (namespace === null) {
    return generateContent(records, enums, context)
  }
  return `export namespace ${namespace} {
    ${generateContent(records, enums, context)}
  }`
}
