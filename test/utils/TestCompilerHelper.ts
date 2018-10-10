import {
  Program,
  TypeNode,
  SyntaxKind,
  TypeChecker,
  isUnionTypeNode,
  UnionTypeNode,
  isTypeReferenceNode,
  TypeReferenceNode,
  isArrayTypeNode,
  ArrayTypeNode,
  isTypeLiteralNode,
  TypeLiteralNode,
  isIndexSignatureDeclaration,
  IndexSignatureDeclaration,
  isParenthesizedTypeNode,
  forEachChild,
  InterfaceDeclaration,
  Node,
  ClassDeclaration,
  EnumDeclaration,
  TypeAliasDeclaration,
  FunctionDeclaration,
  CompilerHost,
  ScriptTarget,
  CompilerOptions,
  createProgram,
  Identifier,
  PropertySignature,
} from 'typescript'
import { expect } from 'chai'
import { TestCompilerHost } from './TestCompilerHost'
import { format } from '../../src/fileUtils'

interface NamedNode {
  name?: Identifier
}

export const DefaultCompilerOptions: CompilerOptions = {
  noResolve: true,
  target: ScriptTarget.ES5,
  strictNullChecks: true,
}

export class TestCompilerHelper {
  private readonly program: Program
  private readonly typeChecker: TypeChecker
  private readonly compilerHost: CompilerHost
  private readonly sourceCode: string

  constructor(source: string) {
    this.compilerHost = new TestCompilerHost(source, this.getFileName(), this.getCompilerOptions())
    this.program = createProgram([this.getFileName()], this.getCompilerOptions(), this.compilerHost)
    this.typeChecker = this.program.getTypeChecker()
    this.sourceCode = source
  }

  // Configurable settings

  protected getCompilerOptions() {
    return DefaultCompilerOptions
  }

  protected getFileName() {
    return 'sample.ts'
  }

  // Asserters

  expectStringType = (node: TypeNode) => expect(node.kind).to.eq(SyntaxKind.StringKeyword)
  expectNumberType = (node: TypeNode) => expect(node.kind).to.eq(SyntaxKind.NumberKeyword)
  expectBooleanType = (node: TypeNode) => expect(node.kind).to.eq(SyntaxKind.BooleanKeyword)
  expectNullType = (node: TypeNode) => expect(node.kind).to.eq(SyntaxKind.NullKeyword)
  expectArrayType = (asserter: (elementNode: TypeNode) => void) => (node: TypeNode) => {
    expect(isArrayTypeNode(node)).to.eq(true)
    asserter((node as ArrayTypeNode).elementType)
  }
  expectMapType = (asserter: (signatureNode: TypeNode) => void) => (node: TypeNode) => {
    expect(isTypeLiteralNode(node)).to.eq(true)
    const typeLiteralNode = node as TypeLiteralNode
    expect(typeLiteralNode.members).to.have.length(1)
    const firstMember = typeLiteralNode.members[0]
    expect(isIndexSignatureDeclaration(firstMember)).to.eq(true)
    asserter((firstMember as IndexSignatureDeclaration).type)
  }
  expectUnionType = (types: string[]) => (node: TypeNode) => {
    node = isParenthesizedTypeNode(node) ? node.type : node
    expect(isUnionTypeNode(node)).to.eq(true)
    const actualTypes = (node as UnionTypeNode).types
      .map((n) => this.typeChecker.getTypeFromTypeNode(n))
      .map((t) => this.typeChecker.typeToString(t))
    expect(actualTypes).to.have.members(types)
  }
  expectTypeReference = (type: string) => (node: TypeNode) => {
    expect(isTypeReferenceNode(node)).to.eq(true)
    expect((node as TypeReferenceNode).typeName.getText()).to.eq(type)
  }
  expectStringArrayType = this.expectArrayType(this.expectStringType)
  expectNumberArrayType = this.expectArrayType(this.expectNumberType)
  expectBooleanArrayType = this.expectArrayType(this.expectBooleanType)
  expectNullArrayType = this.expectArrayType(this.expectNullType)

  expectParameterTypes = (...asserters: ((signatureNode: TypeNode) => void)[]) => (fn: FunctionDeclaration) => {
    expect(fn.parameters).to.have.length(asserters.length)
    for (let i = 0; i < asserters.length; i += 1) {
      asserters[i](fn.parameters[i].type)
    }
  }

  // Bulk getters

  getASTNodesOfType = <T extends Node>(kind: SyntaxKind) => {
    return (): T[] => {
      const items: T[] = []
      forEachChild(this.program.getSourceFile(this.getFileName()), (node: Node) => {
        if (node.kind === kind) {
          items.push(node as T)
        }
      })
      return items
    }
  }

  getInterfaces = this.getASTNodesOfType<InterfaceDeclaration>(SyntaxKind.InterfaceDeclaration)
  getClasses = this.getASTNodesOfType<ClassDeclaration>(SyntaxKind.ClassDeclaration)
  getEnums = this.getASTNodesOfType<EnumDeclaration>(SyntaxKind.EnumDeclaration)
  getTypeAliases = this.getASTNodesOfType<TypeAliasDeclaration>(SyntaxKind.TypeAliasDeclaration)
  getFunctions = this.getASTNodesOfType<FunctionDeclaration>(SyntaxKind.FunctionDeclaration)

  // Named getters

  getNamedType = <T extends NamedNode>(getAll: () => T[]) => (name: string): T => {
    const item = getAll().find((type) => type.name.escapedText.toString() === name)
    expect(item).to.be.an('object')
    return item
  }

  getInterface = this.getNamedType<InterfaceDeclaration>(this.getInterfaces)
  getEnum = this.getNamedType<EnumDeclaration>(this.getEnums)
  getClass = this.getNamedType<ClassDeclaration>(this.getClasses)
  getFunction = this.getNamedType<FunctionDeclaration>(this.getFunctions)
  getTypeAlias = this.getNamedType<TypeAliasDeclaration>(this.getTypeAliases)

  getFields = (i: InterfaceDeclaration): PropertySignature[] => {
    return i.members.map((member) => {
      expect(member.kind).to.eq(SyntaxKind.PropertySignature)
      return member as PropertySignature
    })
  }

  getField = (i: InterfaceDeclaration) => (name: string): PropertySignature =>
    this.getNamedType(() => this.getFields(i) as NamedNode[])(name) as PropertySignature

  getFieldType = (i: InterfaceDeclaration) => (name: string): TypeNode => {
    const field = this.getField(i)(name)
    expect(field.kind).to.eq(SyntaxKind.PropertySignature)
    expect(field.type).to.be.an('object')
    return field.type
  }

  // Utilities

  printSourceCode() {
    console.log(format(this.sourceCode))
  }
}
