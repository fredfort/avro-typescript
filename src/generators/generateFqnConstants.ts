import { NamedType } from '../model'
import { fqnConstantName, qualifiedName } from './utils'

export function generateFqnConstant(type: NamedType): string {
  return `export const ${fqnConstantName(type)} = '${qualifiedName(type)}'`
}
