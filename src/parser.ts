import { ArgumentParser } from 'argparse'
import { EnumVariant, TypeVariant, SubCommand } from './model'

export const parser = new ArgumentParser({
  description: 'Avro schema to TypeScript generator',
})

const subParsers = parser.addSubparsers({
  title: 'subcommands',
  dest: 'command',
})

const diagnoseParser = subParsers.addParser(SubCommand.DIAGNOSE.toString(), {
  description: 'Diagnoses the input file(s), gives suggestions on options.',
})

diagnoseParser.addArgument(['--file', '-f'], {
  required: true,
  action: 'append',
  dest: 'files',
  help: 'Path to the .avsc file(s) to be consumed.',
})

const generateParser = subParsers.addParser(SubCommand.GENERATE.toString(), {
  description: 'Generates TypeScript from the given input file(s).',
})

generateParser.addArgument(['--file', '-f'], {
  required: true,
  action: 'append',
  dest: 'files',
  help: 'Path to the .avsc file(s) to be consumed.',
})

generateParser.addArgument(['--enums', '-e'], {
  required: false,
  dest: 'enums',
  defaultValue: EnumVariant.STRING,
  choices: [EnumVariant.STRING, EnumVariant.ENUM, EnumVariant.CONST_ENUM],
  help: 'The type of the generated enums.',
})

generateParser.addArgument(['--types', '-t'], {
  required: false,
  dest: 'types',
  defaultValue: TypeVariant.INTERFACES_ONLY,
  choices: [TypeVariant.INTERFACES_ONLY, TypeVariant.CLASSES],
  help: 'The type of the generated types.',
})

generateParser.addArgument(['--namespaces', '-n'], {
  required: false,
  dest: 'namespaces',
  action: 'storeTrue',
  defaultValue: false,
  choices: [EnumVariant.STRING, EnumVariant.ENUM, EnumVariant.CONST_ENUM],
  help: 'Flag indicating if namespaces should be generated or not.',
})
