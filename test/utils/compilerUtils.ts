import {
  CompilerHost,
  createSourceFile,
  ScriptTarget,
  SourceFile,
  CompilerOptions,
  createProgram,
  Program,
  SyntaxKind,
  forEachChild,
  Node,
  Identifier,
  InterfaceDeclaration,
  ClassDeclaration,
  EnumDeclaration,
  PropertySignature,
  TypeFlags,
  UnionType,
  TypeAliasDeclaration,
  FunctionDeclaration,
} from 'typescript'

export const SAMPLE_FILE_NAME = 'sample.ts'

export class TestCompilerHost implements CompilerHost {
  constructor(private readonly code: string) {}
  fileExists = () => true
  getCanonicalFileName = () => SAMPLE_FILE_NAME
  getCurrentDirectory = () => ''
  getDefaultLibFileName = () => 'lib.d.ts'
  getDirectories = () => []
  getNewLine = () => '\n'
  readFile = () => null
  useCaseSensitiveFileNames = () => true
  writeFile = () => {}
  getSourceFile(filename: string): SourceFile {
    return createSourceFile(filename, this.code, ScriptTarget.Latest, true)
  }
}

export function getProgram(sourceText: string): Program {
  const config: CompilerOptions = {
    noResolve: true,
    target: ScriptTarget.Latest,
  }
  return createProgram([SAMPLE_FILE_NAME], config, new TestCompilerHost(sourceText))
}

export function getSingleSourceFile(program: Program): SourceFile {
  return program.getSourceFile(SAMPLE_FILE_NAME)
}

function getASTNodesOfType<T extends Node>(kind: SyntaxKind) {
  return (file: SourceFile): T[] => {
    const items: T[] = []
    forEachChild(file, (node: Node) => {
      if (node.kind === kind) {
        items.push(node as T)
      }
    })
    return items
  }
}

export const getInterfaces = getASTNodesOfType<InterfaceDeclaration>(SyntaxKind.InterfaceDeclaration)
export const getClasses = getASTNodesOfType<ClassDeclaration>(SyntaxKind.ClassDeclaration)
export const getEnums = getASTNodesOfType<EnumDeclaration>(SyntaxKind.EnumDeclaration)
export const getTypeAliases = getASTNodesOfType<TypeAliasDeclaration>(SyntaxKind.TypeAliasDeclaration)
export const getFunctions = getASTNodesOfType<FunctionDeclaration>(SyntaxKind.FunctionDeclaration)

export function getSimpleFields(interfaceDecl: InterfaceDeclaration): PropertySignature[] {
  return interfaceDecl.members
    .filter((member) => (member.kind = SyntaxKind.PropertySignature))
    .map((member) => member as PropertySignature)
}

export function getSimpleField(interfaceDecl: InterfaceDeclaration, name: string): PropertySignature {
  return getSimpleFields(interfaceDecl).find((prop) => (prop.name as Identifier).escapedText === name)
}

export function getTypeName(program: Program, prop: PropertySignature): string {
  const typeChecker = program.getTypeChecker()
  const type = typeChecker.getTypeAtLocation(prop.type)
  return typeChecker.typeToString(type)
}

export function getUnionTypeNames(program: Program, prop: PropertySignature): string[] {
  const typeChecker = program.getTypeChecker()
  const type = typeChecker.getTypeAtLocation(prop.type)
  if (type.flags & TypeFlags.Union) {
    return (type as UnionType).types.map((t) => typeChecker.typeToString(t))
  }
  throw new TypeError(`not a union type`)
}
