import { expect } from 'chai'
import {
  RecordWithPrimitives,
  RecordWithArrays,
  Distance,
  MapValue,
  Person,
  FullName,
  Address,
  Human,
  Dog,
  Tree,
  Leaf,
} from './classModels/classModels'

describe('Classes', () => {
  it('Should serialize/deserialize primitive types', () => {
    const input = {
      bool: true,
      double: 1.2,
      float: 3.4,
      int: 4,
      long: 3,
      other: null,
      str: 'hi',
    }
    const parsed = RecordWithPrimitives.deserialize(input)
    expect(parsed).to.be.instanceOf(RecordWithPrimitives)
    expect(RecordWithPrimitives.serialize(parsed)).to.deep.equal(input)
  })

  it('Should serialize/deserialize array types', () => {
    const input = {
      multiTypeArray: [{ int: 5 }, { string: 'hello' }, { int: 4 }],
      simpleArray: ['he', 'llo', 'world'],
    }
    const parsed = RecordWithArrays.deserialize(input)
    expect(parsed).to.be.instanceOf(RecordWithArrays)
    expect(parsed.multiTypeArray).to.deep.equal([5, 'hello', 4])
    expect(RecordWithArrays.serialize(parsed)).to.deep.equal(input)
  })

  it('Should serialize/deserialize enum types', () => {
    const input = {
      amount: 1,
      unit: 'miles',
    }
    const parsed = Distance.deserialize(input)
    expect(parsed).to.be.instanceOf(Distance)
    expect(Distance.serialize(parsed)).to.deep.equal(input)
  })

  it('Should serialize/deserialize map types', () => {
    const input = {
      value: {
        hi: 1,
        hello: 2,
      },
    }
    const parsed = MapValue.deserialize(input)
    expect(parsed).to.be.instanceOf(MapValue)
    expect(MapValue.serialize(parsed)).to.deep.equal(input)
  })

  it('Should serialize/deserialize multiple types', () => {
    const input = {
      fullname: {
        firstName: 'John',
        lastName: 'Doe',
      },
      addresses: [{ city: 'SF', country: 'USA' }, { city: 'Dublin', country: 'Ireland' }],
    }
    const parsed = Person.deserialize(input)
    expect(parsed).to.be.instanceof(Person)
    expect(parsed.fullname).to.be.instanceof(FullName)
    expect(parsed.addresses).to.have.length(2)
    expect(parsed.addresses[0]).to.be.instanceof(Address)
    expect(parsed.addresses[1]).to.be.instanceof(Address)
    expect(Person.serialize(parsed)).to.deep.equal(input)
  })

  it('Should serialize/deserialize namespaced types', () => {
    const human1 = {
      firstname: 'Human1',
      lastname: 'Human1',
    }
    const human2 = {
      firstname: 'Human2',
      lastname: 'Human2',
    }
    const input = {
      name: 'Dog1',
      extra: [{ [Human.FQN]: human1 }],
      owner: { [Human.FQN]: human2 },
      friend: null,
      other: { [Human.FQN]: human1 },
    }

    const parsed = Dog.deserialize(input)

    expect(parsed.owner).to.be.instanceOf(Human)
    expect(parsed.other).to.be.instanceOf(Human)
    expect(parsed.extra).to.have.length(1)
    expect(parsed.extra[0]).to.be.instanceOf(Human)
    expect(parsed.friend).to.be.eq(null)

    expect(Dog.serialize(parsed)).to.deep.equal(input)
  })

  it('Should serialize/deserialize nested union types', () => {
    const input = {
      left: {
        'com.company.Tree': {
          left: {
            'com.company.Leaf': {
              value: 'leaf1',
            },
          },
          right: {
            'com.company.Tree': {
              left: null,
              right: null,
            },
          },
        },
      },
      right: {
        'com.company.Leaf': {
          value: 'leaf2',
        },
      },
    }
    const parsed = Tree.deserialize(input)
    expect(parsed).to.be.instanceOf(Tree)
    expect(parsed.left).to.be.instanceOf(Tree)
    expect((parsed.left as Tree).left).to.be.instanceOf(Leaf)
    expect((parsed.left as Tree).right).to.be.instanceOf(Tree)
    expect(parsed.right).to.be.instanceOf(Leaf)
    expect(Tree.serialize(parsed)).to.be.deep.equal(input)
  })
})
