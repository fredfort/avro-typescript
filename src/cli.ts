import { basename } from 'path'
import { generateAll } from './generators/generateAll'
import { SubCommand, CommandLineArgs } from './model'
import { parser } from './parser'
import { getAllFiles, readSchema, writeTypescriptOutput } from './fileUtils'
import { performDiagnostics } from './diagnostics/performDiagnostics'

const args: CommandLineArgs = parser.parseArgs()
switch (args.command) {
  case SubCommand.DIAGNOSE:
    getAllFiles(args.files).forEach((f) => performDiagnostics(f, readSchema(f), args))
    break
  case SubCommand.GENERATE: {
    const source = getAllFiles(args.files)
      .map((f) => `// Generated from ${basename(f)}\n\n${generateAll(readSchema(f), args)}\n`)
      .join('\n')
    writeTypescriptOutput(source)
    break
  }
}
