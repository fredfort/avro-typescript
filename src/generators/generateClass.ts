import { RecordType, HasName, Field } from '../model'
import { className, interfaceName, qualifiedName } from './utils'
import { generateDeserialize } from './generateDeserialize'
import { generateSerialize } from './generateSerialize'
import { generateFieldType } from './generateFieldType'
import { FqnResolver } from './FqnResolver';

function generateClassFieldDeclaration(field: Field, fqns: FqnResolver, mapping: Map<string, HasName>): string {
  return `public readonly ${field.name}: ${generateFieldType(field.type, fqns, mapping)}`
}

export function generateClass(type: RecordType, fqns: FqnResolver, mapping: Map<string, HasName>): string {
  const assignments =
    type.fields.length === 0
      ? '/* noop */'
      : type.fields.map((field) => `this.${field.name} = input.${field.name};`).join('\n')

  return `export class ${className(type)} implements ${interfaceName(type)} {
    public static FQN = '${qualifiedName(type)}'
    ${type.fields.map((f) => generateClassFieldDeclaration(f, fqns, mapping)).join('\n')}
    constructor(input: Partial<${interfaceName(type)}>) {
      ${assignments}
    }
    ${generateDeserialize(type, fqns, mapping)}
    ${generateSerialize(type, fqns, mapping)}
  }`
}
