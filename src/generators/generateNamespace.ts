import { ITypeContext } from '../model'
import { generateContent } from './generateContent'

export function generateNamespace(namespace: string, context: ITypeContext): string {
  if (namespace === null) {
    return generateContent(context.getRecordTypes(), context.getEnumTypes(), context)
  }
  const content = generateContent(
    context.getRecordTypesInNamespace(namespace),
    context.getEnumTypesInNamespace(namespace),
    context,
  )
  return `export namespace ${namespace} {
    ${content}
  }`
}
