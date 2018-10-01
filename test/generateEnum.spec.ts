import { expect } from 'chai'
import { getProgram, getSingleSourceFile, getEnums, getTypeAliases } from './utils/compilerUtils'
import { getSchema } from './utils/fileUtils'
import { generateEnumType } from '../src/generators/generateEnum'
import { RootTypeContext } from '../src/common/RootTypeContext'
import { EnumVariant } from '../src/model'
import { SyntaxKind, UnionTypeNode } from 'typescript'

describe('Generate Enums', () => {
  describe('Person', () => {
    const schema = getSchema('Person')
    describe('enum', () => {
      const context = new RootTypeContext([{ filename: 'Person', rootType: schema }], { enums: EnumVariant.ENUM })
      const genderSchema = context.getEnumType('Gender')
      const sourceCode = `${generateEnumType(genderSchema, context)}`
      const program = getProgram(sourceCode)
      const source = getSingleSourceFile(program)
      const enums = getEnums(source)

      it('should have generated Gender as a basic enum', () => {
        expect(enums).to.have.length(1)
        expect(enums.map((e) => e.name.getText())).to.have.members(['Gender'])
      })

      it('should have generated "male" and "female" enum constants', () => {
        const gender = enums.find((e) => e.name.getText() === 'Gender')
        expect(gender.members).to.have.length(2)
        expect(gender.members.map((v) => v.name.getText())).to.have.members(['male', 'female'])
        expect(gender.members.map((v) => v.initializer.getText())).to.have.members(["'male'", "'female'"])
      })
    })

    describe('const enum', () => {
      const context = new RootTypeContext([{ filename: 'Person', rootType: schema }], { enums: EnumVariant.CONST_ENUM })
      const genderSchema = context.getEnumType('Gender')
      const sourceCode = `${generateEnumType(genderSchema, context)}`
      const program = getProgram(sourceCode)
      const source = getSingleSourceFile(program)
      const enums = getEnums(source)

      it('should have generated Gender as a basic enum', () => {
        expect(enums).to.have.length(1)
        expect(enums.map((e) => e.name.getText())).to.have.members(['Gender'])
      })

      it('should have generated "male" and "female" enum constants', () => {
        const gender = enums.find((e) => e.name.getText() === 'Gender')
        expect(gender.members).to.have.length(2)
        expect(gender.members.map((v) => v.name.getText())).to.have.members(['male', 'female'])
        expect(gender.members.map((v) => v.initializer.getText())).to.have.members(["'male'", "'female'"])
      })

      it('should have generated a const enum', () => {
        const gender = enums.find((e) => e.name.getText() === 'Gender')
        expect(gender.modifiers.some((e) => e.kind === SyntaxKind.ConstKeyword)).to.eq(true)
      })
    })

    describe('string union', () => {
      const context = new RootTypeContext([{ filename: 'Person', rootType: schema }], { enums: EnumVariant.STRING })
      const genderSchema = context.getEnumType('Gender')
      const sourceCode = `${generateEnumType(genderSchema, context)}`
      const program = getProgram(sourceCode)
      const source = getSingleSourceFile(program)
      const enums = getTypeAliases(source)

      it('should have generated Gender as a basic enum', () => {
        expect(enums).to.have.length(1)
        expect(enums.map((e) => e.name.getText())).to.have.members(['Gender'])
      })

      it('should have "male" and "female" as literals', () => {
        const gender = enums.find((e) => e.name.getText() === 'Gender')
        expect(gender.type.kind).to.eq(SyntaxKind.UnionType)
        const unionType = gender.type as UnionTypeNode
        expect(unionType.types.map((t) => t.getText())).to.have.members(["'male'", "'female'"])
      })
    })
  })
})
