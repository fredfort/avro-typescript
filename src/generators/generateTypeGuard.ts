import { interfaceName, typeGuardName } from './utils'
import { RecordType } from '../model'
import { GeneratorContext } from './typings'

function generateFieldPresenceChecks(type: RecordType): string {
  return type.fields.map((field) => `input.${field.name} !== undefined`).join(' && ')
}

export function generateTypeGuard(type: RecordType, context: GeneratorContext) {
  const extraChecks = type.fields.length === 0 ? '' : ` && ${generateFieldPresenceChecks(type)}`
  return `export function ${typeGuardName(type)}(input: any): input is ${interfaceName(type)} {
    return input instanceof Object${extraChecks} && Object.keys(input).length === ${type.fields.length}
  }`
}
