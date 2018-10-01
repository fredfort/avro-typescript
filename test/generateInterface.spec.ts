import { expect } from 'chai'
import {
  getProgram,
  getSingleSourceFile,
  getInterfaces,
  getSimpleField,
  getSimpleFields,
  getTypeName,
  getUnionTypeNames,
} from './utils/compilerUtils'
import { getSchema } from './utils/fileUtils'
import { generateInterface } from '../src/generators/generateInterface'
import { generateEnumType } from '../src/generators/generateEnum'
import { RootTypeContext } from '../src/common/RootTypeContext'

describe('Generate Interfaces', () => {
  describe('Primitives', () => {
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
  describe('Tree', () => {
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

  describe('Person', () => {
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
})
