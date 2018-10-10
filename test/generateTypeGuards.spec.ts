import { expect } from 'chai'
import { getSchema } from './utils/fileUtils'
import { generateInterface } from '../src/generators/generateInterface'
import { generateTypeGuard } from '../src/generators/generateTypeGuard'
import { RootTypeContext } from '../src/common/RootTypeContext'
import {
  FunctionDeclaration,
  SyntaxKind,
  Block,
  ReturnStatement,
  BinaryExpression,
  Expression,
  Identifier,
  PropertyAccessExpression,
  NumericLiteral,
} from 'typescript'
import { TestCompilerHelper } from './utils/TestCompilerHelper'

describe('Generate Type Guards', () => {
  function collectLeafs(expr: BinaryExpression, nodes: Expression[]): Expression[] {
    if (expr.operatorToken.kind !== SyntaxKind.AmpersandAmpersandToken) {
      nodes.push(expr)
      return nodes
    }
    if (expr.left.kind === SyntaxKind.BinaryExpression) {
      collectLeafs(expr.left as BinaryExpression, nodes)
    } else {
      nodes.push(expr.left)
    }
    if (expr.right.kind === SyntaxKind.BinaryExpression) {
      collectLeafs(expr.right as BinaryExpression, nodes)
    } else {
      nodes.push(expr.right)
    }
    return nodes
  }

  function checkTypeGuard(fn: FunctionDeclaration, checkedType: string, props: string[]): void {
    // Check for basic parameter details
    expect(fn.parameters).to.have.length(1)
    const paramName = fn.parameters[0].name.getText()
    expect(fn.parameters[0].type.getText()).to.eq('any')

    // Check for return type
    expect(fn.type.getText()).to.eq(`${paramName} is ${checkedType}`)
    expect(fn.body.kind).to.eq(SyntaxKind.Block)

    // Check for body statements & get down to big || statement
    const body = fn.body as Block
    expect(body.statements).to.have.length(1)
    expect(body.statements[0].kind).to.eq(SyntaxKind.ReturnStatement)

    const returnStatement = body.statements[0] as ReturnStatement
    expect(returnStatement.expression.kind).to.eq(SyntaxKind.BinaryExpression)

    const expression = returnStatement.expression as BinaryExpression

    // get all the leaf checks
    const leafs = collectLeafs(expression, [])

    // Check if there are the right amount of checks
    expect(leafs).to.have.length(props.length + 2) // Check for each prop plus object type check, and excess property check

    // Check instanceof Object check
    expect(leafs[0].kind).to.eq(SyntaxKind.BinaryExpression)
    const instanceOfObjectCheck = leafs[0] as BinaryExpression

    expect(instanceOfObjectCheck.left.kind).to.eq(SyntaxKind.Identifier)
    expect((instanceOfObjectCheck.left as Identifier).escapedText).to.eq(paramName)

    expect(instanceOfObjectCheck.operatorToken.kind).to.eq(SyntaxKind.InstanceOfKeyword)

    expect(instanceOfObjectCheck.right.kind).to.eq(SyntaxKind.Identifier)
    expect((instanceOfObjectCheck.right as Identifier).escapedText).to.eq('Object')

    // Property name checks
    const propertyChecks = leafs.slice(1, leafs.length - 1)
    expect(propertyChecks).to.have.length(props.length)

    // Check each property check
    const toCheckAgainst = new Set(props)
    propertyChecks.forEach((check) => {
      expect(check.kind).to.eq(SyntaxKind.BinaryExpression)
      const { left, operatorToken, right } = check as BinaryExpression
      expect(left.kind).to.eq(SyntaxKind.PropertyAccessExpression)
      const propAccess = left as PropertyAccessExpression
      expect(propAccess.expression.kind).to.eq(SyntaxKind.Identifier)
      expect((propAccess.expression as Identifier).escapedText).to.eq(paramName)
      expect(toCheckAgainst).to.include(propAccess.name.escapedText)
      toCheckAgainst.delete(propAccess.name.escapedText.toString())
      expect(operatorToken.kind).to.eq(SyntaxKind.ExclamationEqualsEqualsToken)
      expect(right.kind).to.eq(SyntaxKind.Identifier)
      expect((right as Identifier).escapedText).to.eq('undefined')
    })

    expect(leafs[leafs.length - 1].kind).to.eq(SyntaxKind.BinaryExpression)
    const keyCountCheck = leafs[leafs.length - 1] as BinaryExpression
    expect(keyCountCheck.operatorToken.kind).to.eq(SyntaxKind.EqualsEqualsEqualsToken)
    expect(keyCountCheck.right.kind).to.eq(SyntaxKind.NumericLiteral)
    const keyCount = keyCountCheck.right as NumericLiteral
    expect(parseInt(keyCount.text, 10)).to.eq(props.length)
  }

  describe('Primitives', () => {
    const schema = getSchema('PrimitiveProps')
    const context = new RootTypeContext([{ filename: 'sample', rootType: schema }])
    const interfaceSource = generateInterface(context.getRecordType('PrimitiveProps'), context)
    const typeGuardSource = generateTypeGuard(context.getRecordType('PrimitiveProps'), context)
    const sourceCode = `${interfaceSource}\n${typeGuardSource}`
    const t = new TestCompilerHelper(sourceCode)

    it('should have named the type guard correctly', () => {
      expect(t.getFunctions()).to.have.length(1)
      expect(t.getFunction('isPrimitiveProps')).to.be.an('object')
    })

    it('should check for the right properties', () => {
      checkTypeGuard(t.getFunction('isPrimitiveProps'), 'IPrimitiveProps', [
        'stringProp',
        'booleanProp',
        'longProp',
        'intProp',
        'doubleProp',
        'floatProp',
        'nullProp',
      ])
    })
  })

  describe('Person', () => {
    const schema = getSchema('Person')
    const context = new RootTypeContext([{ filename: 'sample', rootType: schema }])
    const interfaceSource = generateInterface(context.getRecordType('Person'), context)
    const typeGuardSource = generateTypeGuard(context.getRecordType('Person'), context)
    const sourceCode = `${interfaceSource}\n${typeGuardSource}`
    const t = new TestCompilerHelper(sourceCode)

    it('should have named the type guard correctly', () => {
      expect(t.getFunctions()).to.have.length(1)
      expect(t.getFunction('isPerson')).to.be.an('object')
    })

    it('should check for the right properties', () => {
      checkTypeGuard(t.getFunction('isPerson'), 'IPerson', ['name', 'birthYear', 'gender'])
    })
  })
})
