import { RecordType, Field, GeneratorContext } from '../model'
import { interfaceName } from './utils'
import { generateFieldType } from './generateFieldType'

function generateFieldDeclaration(field: Field, context: GeneratorContext): string {
  return `${field.name}: ${generateFieldType(field.type, context)}`
}

export function generateInterface(type: RecordType, context: GeneratorContext): string {
  return `export interface ${interfaceName(type)} {
    ${type.fields.map((field) => generateFieldDeclaration(field, context)).join('\n')}
  }`
}
