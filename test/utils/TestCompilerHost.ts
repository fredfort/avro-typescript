import { CompilerHost, SourceFile, createSourceFile, CompilerOptions } from 'typescript'

export class TestCompilerHost implements CompilerHost {
  private readonly code: string
  private readonly sampleFileName: string
  private readonly options: CompilerOptions
  constructor(code: string, fileName: string, options: CompilerOptions) {
    this.code = code
    this.sampleFileName = fileName
    this.options = options
  }
  fileExists = () => true
  getCanonicalFileName = () => this.sampleFileName
  getCurrentDirectory = () => ''
  getDefaultLibFileName = () => 'lib.d.ts'
  getDirectories = () => []
  getNewLine = () => '\n'
  readFile = () => null
  useCaseSensitiveFileNames = () => true
  writeFile = () => {}
  getSourceFile(filename: string): SourceFile {
    return createSourceFile(filename, this.code, this.options.target, true)
  }
}
