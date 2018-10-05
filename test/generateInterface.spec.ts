import { expect } from 'chai'
import {
  getProgram,
  getSingleSourceFile,
  getInterfaces,
  getSimpleField,
  getSimpleFields,
  getTypeName,
  getUnionTypeNames,
  getArrayTypeName,
} from './utils/compilerUtils'
import { getSchema } from './utils/fileUtils'
import { generateInterface } from '../src/generators/generateInterface'
import { generateEnumType } from '../src/generators/generateEnum'
import { RootTypeContext } from '../src/common/RootTypeContext'
import { Options, EnumVariant } from '../src/model'

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
      const types = {
        string: 'string',
        boolean: 'boolean',
        long: 'number',
        int: 'number',
        double: 'number',
        float: 'number',
        null: 'null',
      }
      const avroTypes = Object.keys(types)
      expect(getSimpleFields(interfaceDecl)).to.have.length(avroTypes.length)

      avroTypes.forEach((avroType) => {
        const fieldName = `${avroType}Prop`
        const field = getSimpleField(interfaceDecl, fieldName)
        expect(field).to.be.an('object')
        const type = getTypeName(program, field)
        expect(type).to.eq(types[avroType])
      })
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

      const leftField = getSimpleField(interfaceDecl, 'left')
      expect(leftField).to.be.an('object')
      const leftFieldTypes = getUnionTypeNames(program, leftField)
      expect(leftFieldTypes).to.have.members(['ITree', 'ILeaf'])

      const rightField = getSimpleField(interfaceDecl, 'right')
      expect(rightField).to.be.an('object')
      const rightFieldTypes = getUnionTypeNames(program, rightField)
      expect(rightFieldTypes).to.have.members(['ITree', 'ILeaf'])
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

      const nameType = getSimpleField(interfaceDecl, 'name')
      expect(nameType).to.be.an('object')
      expect(getTypeName(program, nameType)).to.eq('string')

      const birthYearType = getSimpleField(interfaceDecl, 'birthYear')
      expect(birthYearType).to.be.an('object')
      expect(getTypeName(program, birthYearType)).to.eq('number')

      const genderType = getSimpleField(interfaceDecl, 'gender')
      expect(genderType).to.be.an('object')
      expect(getTypeName(program, genderType)).to.eq('Gender')
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
      const types = {
        string: 'string',
        boolean: 'boolean',
        long: 'number',
        int: 'number',
        double: 'number',
        float: 'number',
        null: 'null',
      }
      const avroTypes = Object.keys(types)
      expect(getSimpleFields(interfaceDecl)).to.have.length(avroTypes.length)
      avroTypes.forEach((avroType) => {
        const fieldName = `${avroType}ArrayProp`
        const field = getSimpleField(interfaceDecl, fieldName)
        expect(field).to.be.an('object')
        const arrayType = getArrayTypeName(program, field)
        expect(arrayType).to.eq(types[avroType])
      })
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

  describe('PrimitveMapTypes.avsc', () => {
    const schema = getSchema('PrimitiveMapTypes')
    const context = new RootTypeContext([{ filename: 'MixedTypeArrays', rootType: schema }])
    const rootSchema = context.getRecordType('PrimitiveMapTypes')
    const sourceCode = generateInterface(rootSchema, context)
    const program = getProgram(sourceCode)
    const source = getSingleSourceFile(program)
    const interfaces = getInterfaces(source)

    it('should have generated IPrimitiveMapTypes interface', () => {
      const interfaceNames = interfaces.map((i) => i.name.escapedText)
      expect(interfaceNames).to.have.members(['IPrimitiveMapTypes'])
    })
    it('should have added the interface properties correctly', () => {
      const interfaceDecl = interfaces.find((idecl) => idecl.name.escapedText.toString() === 'IPrimitiveMapTypes')
      const types = {
        string: 'string',
        boolean: 'boolean',
        long: 'number',
        int: 'number',
        double: 'number',
        float: 'number',
        null: 'null',
      }
      const avroTypes = Object.keys(types)
      expect(getSimpleFields(interfaceDecl)).to.have.length(avroTypes.length)
      avroTypes.forEach((avroType) => {
        const fieldName = `${avroType}MapProp`
        const field = getSimpleField(interfaceDecl, fieldName)
        expect(field).to.be.an('object')
        const type = getTypeName(program, field)
        // TODO better way to assert this
        expect(type).to.eq(`{ [index: string]: ${types[avroType]}; }`)
      })
    })
  })
})
