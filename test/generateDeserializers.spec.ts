import { expect } from 'chai'
import { getSchema } from './utils/fileUtils'
import { generateInterface } from '../src/generators/generateInterface'
import { generateAvroWrapper } from '../src/generators/generateAvroWrapper'
import { generateFqnConstant } from '../src/generators/generateFqnConstants'
import { generateDeserialize } from '../src/generators/generateDeserialize'
import { generateTypeGuard } from '../src/generators/generateTypeGuard'
import { RootTypeContext } from '../src/common/RootTypeContext'
import { TestCompilerHelper } from './utils/TestCompilerHelper'

describe('Generate Deserializers', () => {
  describe('PrimitiveProps.avsc', () => {
    const schema = getSchema('PrimitiveProps')
    const context = new RootTypeContext([{ filename: 'PrimitiveProps', rootType: schema }])
    const record = context.getRecordType('PrimitiveProps')
    const sourceCode = `${generateAvroWrapper(record, context)}
      ${generateInterface(record, context)}
      ${generateDeserialize(record, context)}`

    const t = new TestCompilerHelper(sourceCode)

    it('should have generated the right interfaces and deserializePrimitiveProps function', () => {
      expect(t.getInterface('IPrimitiveProps')).to.be.an('object')
      expect(t.getInterface('IPrimitivePropsAvroWrapper')).to.be.an('object')
      expect(t.getFunction('deserializePrimitiveProps')).to.be.an('object')
    })

    it('should have generated deserializePrimitiveProps with the proper signature', () => {
      const fn = t.getFunction('deserializePrimitiveProps')
      t.expectParameterTypes(t.expectTypeReference('IPrimitivePropsAvroWrapper'))(fn)
      t.expectTypeReference('IPrimitiveProps')(fn.type)
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
      ${generateDeserialize(leaf, context)}
      ${generateAvroWrapper(tree, context)}
      ${generateInterface(tree, context)}
      ${generateTypeGuard(tree, context)}
      ${generateDeserialize(tree, context)}`

    const t = new TestCompilerHelper(sourceCode)

    it('should have generated the right interfaces and deserializeTree and deserializeLeaf function', () => {
      expect(t.getInterface('ITree')).to.be.an('object')
      expect(t.getInterface('ITreeAvroWrapper')).to.be.an('object')
      expect(t.getInterface('ILeaf')).to.be.an('object')
      expect(t.getInterface('ILeafAvroWrapper')).to.be.an('object')
      expect(t.getFunction('deserializeTree')).to.be.an('object')
      expect(t.getFunction('deserializeLeaf')).to.be.an('object')
    })

    it('should have generated deserializeTree and deserializeLeaf with the proper signature', () => {
      const treeFn = t.getFunction('deserializeTree')
      t.expectParameterTypes(t.expectTypeReference('ITreeAvroWrapper'))(treeFn)
      t.expectTypeReference('ITree')(treeFn.type)

      const leafFn = t.getFunction('deserializeLeaf')
      t.expectParameterTypes(t.expectTypeReference('ILeafAvroWrapper'))(leafFn)
      t.expectTypeReference('ILeaf')(leafFn.type)
    })

    xit('should test for generated body', () => {
      /* TODO */
    })
  })
})
