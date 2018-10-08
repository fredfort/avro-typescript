import { expect } from 'chai'
import { getSchema } from './utils/fileUtils'
import { generateInterface } from '../src/generators/generateInterface'
import { generateEnumType } from '../src/generators/generateEnum'
import { RootTypeContext } from '../src/common/RootTypeContext'
import { TestCompilerHelper } from './utils/TestCompilerHelper'
import { EnumVariant, Options } from '../src/model'

describe('Generate Interfaces', () => {
  describe('Primitives.avsc', () => {
    const schema = getSchema('PrimitiveProps')
    const context = new RootTypeContext([{ filename: 'sample', rootType: schema }])
    const interfaceSource = generateInterface(
      context.getRecordTypes().find(({ name }) => name === 'PrimitiveProps'),
      context,
    )
    const t = new TestCompilerHelper(interfaceSource)

    it('should have named the interfaces correctly', () => {
      expect(t.getInterfaces()).to.have.length(1)
      expect(t.getInterface('IPrimitiveProps')).to.be.an('object')
    })
    it('should have added the interface properties correctly', () => {
      expect(t.getFields(t.getInterface('IPrimitiveProps'))).to.have.length(7)

      const typeOf = t.getFieldType(t.getInterface('IPrimitiveProps'))
      t.expectStringType(typeOf('stringProp'))
      t.expectBooleanType(typeOf('booleanProp'))
      t.expectNumberType(typeOf('intProp'))
      t.expectNumberType(typeOf('longProp'))
      t.expectNumberType(typeOf('floatProp'))
      t.expectNumberType(typeOf('doubleProp'))
      t.expectNullType(typeOf('nullProp'))
    })
  })
  describe('Tree.avsc', () => {
    const schema = getSchema('Tree')
    const context = new RootTypeContext([{ filename: 'Tree', rootType: schema }])
    const treeSchema = context.getRecordType('com.company.Tree')
    const leafSchema = context.getRecordType('com.company.Leaf')
    const sourceCode = `${generateInterface(treeSchema, context)}\n${generateInterface(leafSchema, context)}`
    const t = new TestCompilerHelper(sourceCode)

    it('should have generated both ITree and ILeaf types', () => {
      expect(t.getInterfaces()).to.have.length(2)
      expect(t.getInterface('ITree')).to.be.an('object')
      expect(t.getInterface('ILeaf')).to.be.an('object')
    })
    it('should have added the interface properties correctly', () => {
      expect(t.getFields(t.getInterface('ITree'))).to.have.length(2)

      const typeOf = t.getFieldType(t.getInterface('ITree'))
      t.expectUnionType(['ITree', 'ILeaf'])(typeOf('left'))
      t.expectUnionType(['ITree', 'ILeaf'])(typeOf('right'))
    })
  })
  describe('Person.avsc', () => {
    const schema = getSchema('Person')
    const context = new RootTypeContext([{ filename: 'Person', rootType: schema }])
    const personSchema = context.getRecordType('Person')
    const genderSchema = context.getEnumType('Gender')
    const sourceCode = `${generateEnumType(genderSchema, context)}\n${generateInterface(personSchema, context)}`
    const t = new TestCompilerHelper(sourceCode)

    it('should have generated IPerson interface', () => {
      expect(t.getInterfaces()).to.have.length(1)
      expect(t.getInterface('IPerson')).to.be.an('object')
    })
    it('should have added the interface properties correctly', () => {
      expect(t.getFields(t.getInterface('IPerson'))).to.have.length(3)
      const typeOf = t.getFieldType(t.getInterface('IPerson'))
      t.expectStringType(typeOf('name'))
      t.expectNumberType(typeOf('birthYear'))
      t.expectTypeReference('Gender')(typeOf('gender'))
    })
  })
  describe('PrimitiveArrays.avsc', () => {
    const schema = getSchema('PrimitiveArrays')
    const context = new RootTypeContext([{ filename: 'PrimitiveArrays', rootType: schema }])
    const personSchema = context.getRecordType('PrimitiveArrays')
    const sourceCode = `${generateInterface(personSchema, context)}`
    const t = new TestCompilerHelper(sourceCode)

    it('should have generated IPrimitiveArrays interface', () => {
      expect(t.getInterfaces()).to.have.length(1)
      expect(t.getInterface('IPrimitiveArrays')).to.be.an('object')
    })
    it('should have added the interface properties correctly', () => {
      expect(t.getFields(t.getInterface('IPrimitiveArrays'))).to.have.length(7)
      const typeOf = t.getFieldType(t.getInterface('IPrimitiveArrays'))
      t.expectStringArrayType(typeOf('stringArrayProp'))
      t.expectBooleanArrayType(typeOf('booleanArrayProp'))
      t.expectNumberArrayType(typeOf('intArrayProp'))
      t.expectNumberArrayType(typeOf('longArrayProp'))
      t.expectNumberArrayType(typeOf('floatArrayProp'))
      t.expectNumberArrayType(typeOf('doubleArrayProp'))
      t.expectNullArrayType(typeOf('nullArrayProp'))
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

    const t = new TestCompilerHelper(sourceCode)

    it('should have generated IMixedTypeArrays interface', () => {
      expect(t.getInterface('IMixedTypeArrays')).to.be.an('object')
    })
    // TODO better way to check union types
    it('should have added the interface properties correctly', () => {
      const typeOf = t.getFieldType(t.getInterface('IMixedTypeArrays'))

      t.expectArrayType(t.expectTypeReference('IPlaceholder'))(typeOf('objectArray'))
      t.expectArrayType(t.expectUnionType(['IPlaceholder', 'null']))(typeOf('optionalObjectArray'))
      t.expectArrayType(t.expectTypeReference('PlaceholderEnum'))(typeOf('enumArray'))
      t.expectArrayType(t.expectUnionType(['PlaceholderEnum', 'null']))(typeOf('optionalEnumArray'))
      t.expectArrayType(t.expectUnionType(['string', 'number', 'boolean', 'null']))(typeOf('primitiveTypeUnionArray'))
      t.expectArrayType(t.expectUnionType(['IPlaceholder', 'PlaceholderEnum']))(typeOf('enumOrObjectArray'))
    })
  })

  describe('PrimitveMapTypes.avsc', () => {
    const schema = getSchema('PrimitiveMapTypes')
    const context = new RootTypeContext([{ filename: 'PrimitiveMapTypes', rootType: schema }])
    const rootSchema = context.getRecordType('PrimitiveMapTypes')
    const sourceCode = generateInterface(rootSchema, context)
    const t = new TestCompilerHelper(sourceCode)
    it('should have generated IPrimitiveMapTypes interface', () => {
      expect(t.getInterfaces()).to.have.length(1)
      expect(t.getInterface('IPrimitiveMapTypes')).to.be.an('object')
    })
    it('should have added the interface properties correctly', () => {
      expect(t.getFields(t.getInterface('IPrimitiveMapTypes'))).to.have.length(7)
      const typeOf = t.getFieldType(t.getInterface('IPrimitiveMapTypes'))
      t.expectMapType(t.expectStringType)(typeOf('stringMapProp'))
      t.expectMapType(t.expectBooleanType)(typeOf('booleanMapProp'))
      t.expectMapType(t.expectNumberType)(typeOf('longMapProp'))
      t.expectMapType(t.expectNumberType)(typeOf('intMapProp'))
      t.expectMapType(t.expectNumberType)(typeOf('floatMapProp'))
      t.expectMapType(t.expectNumberType)(typeOf('doubleMapProp'))
      t.expectMapType(t.expectNullType)(typeOf('nullMapProp'))
    })
  })

  describe('UnionTypes.avsc', () => {
    const schema = getSchema('UnionTypes')
    const options: Partial<Options> = { enums: EnumVariant.ENUM }
    const context = new RootTypeContext([{ filename: 'UnionTypes', rootType: schema }], options)
    const sourceCode = `${generateEnumType(context.getEnumType('PlaceholderEnum'), context)}
    ${generateInterface(context.getRecordType('Placeholder'), context)}
    ${generateInterface(context.getRecordType('UnionTypes'), context)}`

    const t = new TestCompilerHelper(sourceCode)

    it('should have generated IUnionTypes interface', () => {
      expect(t.getInterface('IUnionTypes')).to.be.an('object')
    })
    it('should have added the interface properties correctly', () => {
      expect(t.getFields(t.getInterface('IUnionTypes'))).to.have.length(4)
      const typeOf = t.getFieldType(t.getInterface('IUnionTypes'))
      t.expectUnionType(['number', 'string', 'boolean', 'null'])(typeOf('primitiveUnionProp'))
      t.expectUnionType(['null', 'PlaceholderEnum'])(typeOf('enumOrNullProp'))
      t.expectUnionType(['null', 'IPlaceholder'])(typeOf('objectOrNullProp'))
      t.expectUnionType(['null', 'IPlaceholder', 'PlaceholderEnum'])(typeOf('enumNullOrObjectProp'))
    })
  })
})
