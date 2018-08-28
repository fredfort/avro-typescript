import { RecordType, HasName, Field } from '../model'
import { interfaceName } from './utils'
import { generateFieldType } from './generateFieldType'
import { FqnResolver } from './FqnResolver';

function generateFieldDeclaration(field: Field, fqns: FqnResolver, mapping: Map<string, HasName>): string {
  return `${field.name}: ${generateFieldType(field.type, fqns, mapping)}`
}

export function generateInterface(type: RecordType, fqns: FqnResolver, mapping: Map<string, HasName>): string {
  return `export interface ${interfaceName(type)} {
    ${type.fields.map((field) => generateFieldDeclaration(field, fqns, mapping)).join('\n')}
  }`
}
