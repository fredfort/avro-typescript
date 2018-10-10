import { expect } from 'chai'
import { getSchema } from './utils/fileUtils'
import { generateInterface } from '../src/generators/generateInterface'
import { generateAvroWrapper } from '../src/generators/generateAvroWrapper'
import { generateFqnConstant } from '../src/generators/generateFqnConstants'
import { generateSerialize } from '../src/generators/generateSerialize'
import { generateTypeGuard } from '../src/generators/generateTypeGuard'
import { RootTypeContext } from '../src/common/RootTypeContext'
import { TestCompilerHelper } from './utils/TestCompilerHelper'

describe('Generate Serializers', () => {
  describe('PrimitiveProps.avsc', () => {
    const schema = getSchema('PrimitiveProps')
    const context = new RootTypeContext([{ filename: 'PrimitiveProps', rootType: schema }])
    const record = context.getRecordType('PrimitiveProps')
    const sourceCode = `${generateAvroWrapper(record, context)}
      ${generateInterface(record, context)}
      ${generateSerialize(record, context)}`

    const t = new TestCompilerHelper(sourceCode)

    it('should have generated the right interfaces and serializePrimitiveProps function', () => {
      expect(t.getInterface('IPrimitiveProps')).to.be.an('object')
      expect(t.getInterface('IPrimitivePropsAvroWrapper')).to.be.an('object')
      expect(t.getFunction('serializePrimitiveProps')).to.be.an('object')
    })

    it('should have generated serializePrimitiveProps with the proper signature', () => {
      const fn = t.getFunction('serializePrimitiveProps')
      t.expectParameterTypes(t.expectTypeReference('IPrimitiveProps'))(fn)
      t.expectTypeReference('IPrimitivePropsAvroWrapper')(fn.type)
    })

    xit('should test for generated body', () => {
      /* TODO */
    })
  })

  describe('Tree.avsc', () => {
    const schema = getSchema('Tree')
    const context = new RootTypeContext([{ filename: 'Tree', rootType: schema }])
    const tree = context.getRecordType('com.company.Tree')
    const leaf = context.getRecordType('com.company.Leaf')
    // all this is necessary to prevent compile errors and have accurate typings in the AST.
    const sourceCode = `
      ${generateFqnConstant(tree)}
      ${generateFqnConstant(leaf)}
      ${generateAvroWrapper(leaf, context)}
      ${generateInterface(leaf, context)}
      ${generateTypeGuard(leaf, context)}
      ${generateSerialize(leaf, context)}
      ${generateAvroWrapper(tree, context)}
      ${generateInterface(tree, context)}
      ${generateTypeGuard(tree, context)}
      ${generateSerialize(tree, context)}`

    const t = new TestCompilerHelper(sourceCode)

    it('should have generated the right interfaces and serializeTree and serializeLeaf function', () => {
      expect(t.getInterface('ITree')).to.be.an('object')
      expect(t.getInterface('ITreeAvroWrapper')).to.be.an('object')
      expect(t.getInterface('ILeaf')).to.be.an('object')
      expect(t.getInterface('ILeafAvroWrapper')).to.be.an('object')
      expect(t.getFunction('serializeTree')).to.be.an('object')
      expect(t.getFunction('serializeLeaf')).to.be.an('object')
    })

    it('should have generated serializeTree and serializeLeaf with the proper signature', () => {
      const treeFn = t.getFunction('serializeTree')
      t.expectParameterTypes(t.expectTypeReference('ITree'))(treeFn)
      t.expectTypeReference('ITreeAvroWrapper')(treeFn.type)

      const leafFn = t.getFunction('serializeLeaf')
      t.expectParameterTypes(t.expectTypeReference('ILeaf'))(leafFn)
      t.expectTypeReference('ILeafAvroWrapper')(leafFn.type)
    })

    xit('should test for generated body', () => {
      /* TODO */
    })
  })
})
