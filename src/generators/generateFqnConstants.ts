import { HasName } from '../model'
import { fqnConstantName, qualifiedName } from './utils'

export function generateFqnConstant(type: HasName): string {
  return `export const ${fqnConstantName(type)} = '${qualifiedName(type)}'`
}
