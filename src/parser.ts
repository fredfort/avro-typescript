import { ArgumentParser } from 'argparse'
import { EnumVariant, TypeVariant } from './model'

export const parser = new ArgumentParser({
  description: 'Avro schema to TypeScript generator'
})

parser.addArgument(['--file', '-f'], {
  required: true,
  action: 'append',
  dest: 'files',
  help: 'Path to the .avsc file(s) to be consumed.',
})

parser.addArgument(['--enums', '-e'], {
  required: false,
  dest: 'enums',
  defaultValue: EnumVariant.STRING,
  choices: [EnumVariant.STRING, EnumVariant.ENUM, EnumVariant.CONST_ENUM],
  help: 'The type of the generated enums.',
})

parser.addArgument(['--types', '-t'], {
  required: false,
  dest: 'types',
  defaultValue: TypeVariant.INTERFACES_ONLY,
  choices: [TypeVariant.INTERFACES_ONLY, TypeVariant.CLASSES],
  help: 'The type of the generated types.',
})

parser.addArgument(['--namespaces', '-n'], {
  required: false,
  dest: 'namespaces',
  action: 'storeTrue',
  defaultValue: false,
  choices: [EnumVariant.STRING, EnumVariant.ENUM, EnumVariant.CONST_ENUM],
  help: 'Flag indicating if namespaces should be generated or not.',
})
