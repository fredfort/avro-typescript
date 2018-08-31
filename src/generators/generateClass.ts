import { RecordType, Field } from '../model'
import { className, interfaceName } from './utils'
import { generateDeserialize } from './generateDeserialize'
import { generateSerialize } from './generateSerialize'
import { generateFieldType } from './generateFieldType'
import { GeneratorContext } from './typings'
import { generateClone } from './generateClone'

function generateClassFieldDeclaration(field: Field, context: GeneratorContext): string {
  return `public ${field.name}: ${generateFieldType(field.type, context)}`
}

export function generateClass(type: RecordType, context: GeneratorContext): string {
  const assignments =
    type.fields.length === 0
      ? '/* noop */'
      : type.fields.map((field) => `this.${field.name} = input.${field.name};`).join('\n')

  return `export class ${className(type)} implements ${interfaceName(type)} {
    ${type.fields.map((f) => generateClassFieldDeclaration(f, context)).join('\n')}
    constructor(input: Partial<${interfaceName(type)}>) {
      ${assignments}
    }
    ${generateDeserialize(type, context)}
    ${generateSerialize(type, context)}
    ${generateClone(type, context)}
  }`
}
