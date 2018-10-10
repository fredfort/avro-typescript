import { ITypeProvider } from '../model'
import { generateContent } from './generateContent'

export function generateNamespace(namespace: string, context: ITypeProvider): string {
  const content = generateContent(
    context.getRecordTypesInNamespace(namespace),
    context.getEnumTypesInNamespace(namespace),
    context,
  )
  if (!namespace) {
    return content
  }
  return `export namespace ${namespace} {
    ${content}
  }`
}
