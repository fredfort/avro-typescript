import { RecordType, Field, ITypeProvider } from '../model'
import { interfaceName } from './utils'
import { generateFieldType } from './generateFieldType'

function generateFieldDeclaration(field: Field, context: ITypeProvider): string {
  return `${field.name}: ${generateFieldType(field.type, context)}`
}

export function generateInterface(type: RecordType, context: ITypeProvider): string {
  return `export interface ${interfaceName(type)} {
    ${type.fields.map((field) => generateFieldDeclaration(field, context)).join('\n')}
  }`
}
