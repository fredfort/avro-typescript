import { expect } from 'chai'
import {
  getProgram,
  getSingleSourceFile,
  getInterfaces,
  getSimpleField,
  getSimpleFields,
  getArrayTypeName,
} from './utils/compilerUtils'
import { getSchema } from './utils/fileUtils'
import { generateInterface } from '../src/generators/generateInterface'
import { generateEnumType } from '../src/generators/generateEnum'
import { RootTypeContext } from '../src/common/RootTypeContext'
import { Options, EnumVariant } from '../src/model'
import { TypeAsserter } from './utils/TypeAsserter'

describe('Generate Interfaces', () => {
  describe('Primitives.avsc', () => {
    const schema = getSchema('PrimitiveProps')
    const context = new RootTypeContext([{ filename: 'sample', rootType: schema }])
    const interfaceSource = generateInterface(
      context.getRecordTypes().find(({ name }) => name === 'PrimitiveProps'),
      context,
    )
    const program = getProgram(interfaceSource)
    const source = getSingleSourceFile(program)
    const interfaces = getInterfaces(source)

    it('should have named the interfaces correctly', () => {
      const interfaceNames = interfaces.map((i) => i.name.escapedText)
      expect(interfaceNames).to.have.length(1)
      expect(interfaceNames).to.have.members(['IPrimitiveProps'])
    })

    it('should have added the interface properties correctly', () => {
      const interfaceDecl = interfaces.find((idecl) => idecl.name.escapedText.toString() === 'IPrimitiveProps')

      expect(getSimpleFields(interfaceDecl)).to.have.length(7)

      const t = new TypeAsserter(program)
      t.expectStringType(getSimpleField(interfaceDecl, 'stringProp').type)
      t.expectBooleanType(getSimpleField(interfaceDecl, 'booleanProp').type)
      t.expectNumberType(getSimpleField(interfaceDecl, 'intProp').type)
      t.expectNumberType(getSimpleField(interfaceDecl, 'longProp').type)
      t.expectNumberType(getSimpleField(interfaceDecl, 'floatProp').type)
      t.expectNumberType(getSimpleField(interfaceDecl, 'doubleProp').type)
      t.expectNullType(getSimpleField(interfaceDecl, 'nullProp').type)
    })
  })
  describe('Tree.avsc', () => {
    const schema = getSchema('Tree')
    const context = new RootTypeContext([{ filename: 'Tree', rootType: schema }])
    const treeSchema = context.getRecordType('com.company.Tree')
    const leafSchema = context.getRecordType('com.company.Leaf')
    const sourceCode = `${generateInterface(treeSchema, context)}\n${generateInterface(leafSchema, context)}`
    const program = getProgram(sourceCode)
    const source = getSingleSourceFile(program)
    const interfaces = getInterfaces(source)

    it('should have generated both ITree and ILeaf types', () => {
      const interfaceNames = interfaces.map((i) => i.name.escapedText)
      expect(interfaceNames).to.have.length(2)
      expect(interfaceNames).to.have.members(['ITree', 'ILeaf'])
    })

    it('should have added the interface properties correctly', () => {
      const interfaceDecl = interfaces.find((idecl) => idecl.name.escapedText.toString() === 'ITree')
      const t = new TypeAsserter(program)
      t.expectUnionType(getSimpleField(interfaceDecl, 'left').type, ['ITree', 'ILeaf'])
      t.expectUnionType(getSimpleField(interfaceDecl, 'right').type, ['ITree', 'ILeaf'])
    })
  })
  describe('Person.avsc', () => {
    const schema = getSchema('Person')
    const context = new RootTypeContext([{ filename: 'Person', rootType: schema }])
    const personSchema = context.getRecordType('Person')
    const genderSchema = context.getEnumType('Gender')
    const sourceCode = `${generateEnumType(genderSchema, context)}\n${generateInterface(personSchema, context)}`
    const program = getProgram(sourceCode)
    const source = getSingleSourceFile(program)
    const interfaces = getInterfaces(source)

    it('should have generated IPerson interface', () => {
      const interfaceNames = interfaces.map((i) => i.name.escapedText)
      expect(interfaceNames).to.have.length(1)
      expect(interfaceNames).to.have.members(['IPerson'])
    })

    it('should have added the interface properties correctly', () => {
      const interfaceDecl = interfaces.find((idecl) => idecl.name.escapedText.toString() === 'IPerson')
      const t = new TypeAsserter(program)
      t.expectStringType(getSimpleField(interfaceDecl, 'name').type)
      t.expectNumberType(getSimpleField(interfaceDecl, 'birthYear').type)
      t.expectTypeReference(getSimpleField(interfaceDecl, 'gender').type, 'Gender')
    })
  })
  describe('PrimitiveArrays.avsc', () => {
    const schema = getSchema('PrimitiveArrays')
    const context = new RootTypeContext([{ filename: 'PrimitiveArrays', rootType: schema }])
    const personSchema = context.getRecordType('PrimitiveArrays')
    const sourceCode = `${generateInterface(personSchema, context)}`
    const program = getProgram(sourceCode)
    const source = getSingleSourceFile(program)
    const interfaces = getInterfaces(source)

    it('should have generated IPrimitiveArrays interface', () => {
      const interfaceNames = interfaces.map((i) => i.name.escapedText)
      expect(interfaceNames).to.have.length(1)
      expect(interfaceNames).to.have.members(['IPrimitiveArrays'])
    })

    it('should have added the interface properties correctly', () => {
      const interfaceDecl = interfaces.find((idecl) => idecl.name.escapedText.toString() === 'IPrimitiveArrays')
      expect(getSimpleFields(interfaceDecl)).to.have.length(7)
      const t = new TypeAsserter(program)
      t.expectStringArrayType(getSimpleField(interfaceDecl, 'stringArrayProp').type)
      t.expectBooleanArrayType(getSimpleField(interfaceDecl, 'booleanArrayProp').type)
      t.expectNumberArrayType(getSimpleField(interfaceDecl, 'intArrayProp').type)
      t.expectNumberArrayType(getSimpleField(interfaceDecl, 'longArrayProp').type)
      t.expectNumberArrayType(getSimpleField(interfaceDecl, 'floatArrayProp').type)
      t.expectNumberArrayType(getSimpleField(interfaceDecl, 'doubleArrayProp').type)
      t.expectNullArrayType(getSimpleField(interfaceDecl, 'nullArrayProp').type)
    })
  })
  describe('MixedTypeArrays.avsc', () => {
    const schema = getSchema('MixedTypeArrays')
    const options: Partial<Options> = { enums: EnumVariant.ENUM }
    const context = new RootTypeContext([{ filename: 'MixedTypeArrays', rootType: schema }], options)
    const rootSchema = context.getRecordType('MixedTypeArrays')
    const placeholderSchema = context.getRecordType('Placeholder')
    const placeholderEnumSchema = context.getEnumType('PlaceholderEnum')

    const sourceCode = `${generateEnumType(placeholderEnumSchema, context)}
    ${generateInterface(placeholderSchema, context)}
    ${generateInterface(rootSchema, context)}`

    const program = getProgram(sourceCode)
    const source = getSingleSourceFile(program)
    const interfaces = getInterfaces(source)

    it('should have generated IMixedTypeArrays interface', () => {
      const interfaceNames = interfaces.map((i) => i.name.escapedText)
      expect(interfaceNames).to.have.include('IMixedTypeArrays')
    })

    // TODO better way to check union types
    it('should have added the interface properties correctly', () => {
      const interfaceDecl = interfaces.find((idecl) => idecl.name.escapedText.toString() === 'IMixedTypeArrays')

      const objectArrayField = getSimpleField(interfaceDecl, 'objectArray')
      expect(objectArrayField).to.be.an('object')
      expect(getArrayTypeName(program, objectArrayField)).to.eq('IPlaceholder')

      const optionalObjectArrayField = getSimpleField(interfaceDecl, 'optionalObjectArray')
      expect(optionalObjectArrayField).to.be.an('object')
      expect(getArrayTypeName(program, optionalObjectArrayField)).to.eq('IPlaceholder | null')

      const enumArrayField = getSimpleField(interfaceDecl, 'enumArray')
      expect(enumArrayField).to.be.an('object')
      expect(getArrayTypeName(program, enumArrayField)).to.eq('PlaceholderEnum')

      const optionalEnumArrayField = getSimpleField(interfaceDecl, 'optionalEnumArray')
      expect(optionalEnumArrayField).to.be.an('object')
      expect(getArrayTypeName(program, optionalEnumArrayField)).to.eq('PlaceholderEnum | null')

      const primitiveTypeUnionArrayField = getSimpleField(interfaceDecl, 'primitiveTypeUnionArray')
      expect(primitiveTypeUnionArrayField).to.be.an('object')
      expect(getArrayTypeName(program, primitiveTypeUnionArrayField)).to.eq('string | number | boolean | null')

      const enumOrObjectArrayField = getSimpleField(interfaceDecl, 'enumOrObjectArray')
      expect(enumOrObjectArrayField).to.be.an('object')
      expect(getArrayTypeName(program, enumOrObjectArrayField)).to.eq('IPlaceholder | PlaceholderEnum')
    })
  })
})
