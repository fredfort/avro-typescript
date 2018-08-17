import { expect } from 'chai'
import { getAvroToTypeScript, getResult, getSchema} from './test.utils'

describe('TypeScript interface', () => {

  it('Should create the correct primitive type', () => {
    const fileName = 'primitive'
    const schema = getSchema(fileName)
    const expectedResult = getResult(fileName)
    expect(getAvroToTypeScript(schema)).to.be.equal(expectedResult)
  })

  it('Should create the correct array types', () => {
    const fileName = 'array'
    const schema = getSchema(fileName)
    const expectedResult = getResult(fileName)
    expect(getAvroToTypeScript(schema)).to.be.equal(expectedResult)
  })

  it('Should create the correct emun types', () => {
    const fileName = 'enum'
    const schema = getSchema(fileName)
    const expectedResult = getResult(fileName)
    expect(getAvroToTypeScript(schema)).to.be.equal(expectedResult)
  })

  it('Should create the correct emun types into string litteral union', () => {
    const fileName = 'enum'
    const schema = getSchema(fileName)
    const expectedResult = getResult('enum_litteral')
    expect(getAvroToTypeScript(schema, {convertEnumToType: true})).to.be.equal(expectedResult)
  })

  it('Should create the correct map type', () => {
    const fileName = 'map'
    const schema = getSchema(fileName)
    const expectedResult = getResult(fileName)
    expect(getAvroToTypeScript(schema, {convertEnumToType: true})).to.be.equal(expectedResult)
  })

  it('Should create the correct interfaces for object with multiple types', () => {
    const fileName = 'multiple-type'
    const schema = getSchema(fileName)
    const expectedResult = getResult(fileName)
    expect(getAvroToTypeScript(schema, {convertEnumToType: true})).to.be.equal(expectedResult)
  })

})
