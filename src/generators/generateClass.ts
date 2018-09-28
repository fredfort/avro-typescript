import { RecordType, Field, ITypeContext } from '../model'
import { className, interfaceName } from './utils'
import { generateDeserialize } from './generateDeserialize'
import { generateSerialize } from './generateSerialize'
import { generateFieldType } from './generateFieldType'
import { generateClone } from './generateClone'

function generateClassFieldDeclaration(field: Field, context: ITypeContext): string {
  return `public ${field.name}: ${generateFieldType(field.type, context)}`
}

export function generateClass(type: RecordType, context: ITypeContext): string {
  const assignments = type.fields.map((field) => `this.${field.name} = input.${field.name};`).join('\n')

  return `export class ${className(type)} implements ${interfaceName(type)} {
    ${type.fields.map((f) => generateClassFieldDeclaration(f, context)).join('\n')}
    constructor(input: ${interfaceName(type)}) {
      ${type.fields.length === 0 ? '/* noop */' : assignments}
    }
    ${generateDeserialize(type, context)}
    ${generateSerialize(type, context)}
    ${generateClone(type, context)}
  }`
}
