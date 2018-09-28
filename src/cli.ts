import { generateAll } from './generators/generateAll'
import { SubCommand, CommandLineArgs, ICompilationUnit } from './model'
import { parser } from './parser'
import { getAllFiles, readSchema, writeTypescriptOutput } from './fileUtils'
import { performDiagnostics } from './diagnostics/performDiagnostics'

const args: CommandLineArgs = parser.parseArgs()
switch (args.command) {
  case SubCommand.DIAGNOSE:
    getAllFiles(args.files).forEach((f) => performDiagnostics(f, readSchema(f), args))
    break
  case SubCommand.GENERATE: {
    const compilationUnits = getAllFiles(args.files).map(
      (filename: string): ICompilationUnit => ({
        filename,
        rootType: readSchema(filename),
      }),
    )
    writeTypescriptOutput(generateAll(compilationUnits, args))
    break
  }
}
