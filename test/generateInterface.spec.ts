import { expect } from 'chai'
import {
  getProgram,
  getSingleSourceFile,
  getInterfaces,
  getSimpleField,
  getSimpleFields,
  getTypeName,
} from './utils/compilerUtils'
import { getSchema } from './utils/fileUtils'
import { generateInterface } from '../src/generators/generateInterface'
import { TypeContext } from '../src/TypeContext'

describe('Generate Interfaces', () => {
  describe('Primitives', () => {
    const schema = getSchema('PrimitiveProps')
    const interfaceSource = generateInterface(schema, new TypeContext(schema, {}))
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
})
