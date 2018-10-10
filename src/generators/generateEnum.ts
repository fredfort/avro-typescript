import { EnumType, EnumVariant, ITypeProvider } from '../model'
import { enumName } from './utils'

function generateEnum(type: EnumType): string {
  return `export enum ${enumName(type)} {
    ${type.symbols.map((symbol) => `${symbol} = '${symbol}'`).join(',\n')}
  }`
}

function generateConstEnum(type: EnumType): string {
  return `export const enum ${enumName(type)} {
    ${type.symbols.map((symbol) => `${symbol} = '${symbol}'`).join(',\n')}
  }`
}

function generateStringUnion(type: EnumType): string {
  return `export type ${enumName(type)} = ${type.symbols.map((symbol) => `'${symbol}'`).join(' | ')}`
}

export function generateEnumType(type: EnumType, context: ITypeProvider): string {
  switch (context.getOptions().enums) {
    case EnumVariant.ENUM:
      return generateEnum(type)
    case EnumVariant.CONST_ENUM:
      return generateConstEnum(type)
    case EnumVariant.STRING:
      return generateStringUnion(type)
  }
}
