import { EnumType } from '../model'
import { GeneratorContext } from './typings'
import { enumName } from './utils'

function generateEnum(type: EnumType): string {
  return `export enum ${enumName(type)} {
    ${type.symbols.map((symbol) => `${symbol} = '${symbol}'`).join(',\n')}
  }`
}

function generateStringUnion(type: EnumType): string {
  return `export type ${enumName(type)} = ${type.symbols.map((symbol) => `'${symbol}'`).join(' | ')}`
}

export function generateEnumType(type: EnumType, context: GeneratorContext): string {
  if (context.options.convertEnumToType) {
    return generateStringUnion(type)
  }
  return generateEnum(type)
}
