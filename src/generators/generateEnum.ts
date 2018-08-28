import { EnumType } from '../model'

export function generateEnumType(type: EnumType): string {
  return `export type ${type.name} = ${type.symbols.map((symbol) => `'${symbol}'`).join(' | ')}`
}
