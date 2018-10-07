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
} from 'typescript'
import { expect } from 'chai'

export class TypeAsserter {
  private readonly program: Program
  private readonly typeChecker: TypeChecker
  constructor(program: Program) {
    this.program = program
    this.typeChecker = this.program.getTypeChecker()
  }
  expectStringType(node: TypeNode): void {
    expect(node.kind).to.eq(SyntaxKind.StringKeyword)
  }
  expectNumberType(node: TypeNode): void {
    expect(node.kind).to.eq(SyntaxKind.NumberKeyword)
  }
  expectBooleanType(node: TypeNode): void {
    expect(node.kind).to.eq(SyntaxKind.BooleanKeyword)
  }
  expectNullType(node: TypeNode): void {
    expect(node.kind).to.eq(SyntaxKind.NullKeyword)
  }
  expectUnionType(node: TypeNode, types: string[]) {
    expect(isUnionTypeNode(node)).to.eq(true)
    const actualTypes = (node as UnionTypeNode).types
      .map((n) => this.typeChecker.getTypeFromTypeNode(n))
      .map((t) => this.typeChecker.typeToString(t))
    expect(actualTypes).to.have.members(types)
  }
  expectTypeReference(node: TypeNode, type: string) {
    expect(isTypeReferenceNode(node)).to.eq(true)
    expect((node as TypeReferenceNode).typeName.getText()).to.eq(type)
  }
  expectStringArrayType(node: TypeNode) {
    expect(isArrayTypeNode(node)).to.eq(true)
    // TODO
  }
  expectNumberArrayType(node: TypeNode) {
    expect(isArrayTypeNode(node)).to.eq(true)
    // TODO
  }
  expectBooleanArrayType(node: TypeNode) {
    expect(isArrayTypeNode(node)).to.eq(true)
    // TODO
  }
  expectNullArrayType(node: TypeNode) {
    expect(isArrayTypeNode(node)).to.eq(true)
    // TODO
  }
  expectArrayUnionType(node: TypeNode, type: string) {}
}
