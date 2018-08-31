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
  UnitOfDistance,
  IPersonAvroWrapper,
  IMapValueAvroWrapper,
  IDistanceAvroWrapper,
  IRecordWithArraysAvroWrapper,
  IRecordWithPrimitivesAvroWrapper,
  IHumanAvroWrapper,
  IDogAvroWrapper,
  ITreeAvroWrapper,
} from './classModels/classModels'

describe('Classes', () => {
  it('Should serialize/deserialize/clone primitive types', () => {
    const input: IRecordWithPrimitivesAvroWrapper = {
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

    const clone = RecordWithPrimitives.clone(parsed)
    expect(clone).not.to.equal(parsed)
    expect(clone).to.deep.equal(parsed)
  })

  it('Should serialize/deserialize/clone array types', () => {
    const input: IRecordWithArraysAvroWrapper = {
      multiTypeArray: [{ int: 5 }, { string: 'hello' }, { int: 4 }],
      simpleArray: ['he', 'llo', 'world'],
    }
    const parsed = RecordWithArrays.deserialize(input)
    expect(parsed).to.be.instanceOf(RecordWithArrays)
    expect(parsed.multiTypeArray).to.deep.equal([5, 'hello', 4])
    expect(RecordWithArrays.serialize(parsed)).to.deep.equal(input)

    const clone = RecordWithArrays.clone(parsed)
    expect(clone).not.to.equal(parsed)
    expect(clone).to.deep.equal(parsed)
  })

  it('Should serialize/deserialize/clone enum types', () => {
    const input: IDistanceAvroWrapper = {
      amount: 1,
      unit: UnitOfDistance.miles,
    }
    const parsed = Distance.deserialize(input)
    expect(parsed).to.be.instanceOf(Distance)
    expect(Distance.serialize(parsed)).to.deep.equal(input)

    const clone = Distance.clone(parsed)
    expect(clone).not.to.equal(parsed)
    expect(clone).to.deep.equal(parsed)
  })

  it('Should serialize/deserialize/clone map types', () => {
    const input: IMapValueAvroWrapper = {
      value: {
        hi: 1,
        hello: 2,
      },
    }
    const parsed = MapValue.deserialize(input)
    expect(parsed).to.be.instanceOf(MapValue)
    expect(MapValue.serialize(parsed)).to.deep.equal(input)

    const clone = MapValue.clone(parsed)
    expect(clone).not.to.equal(parsed)
    expect(clone).to.deep.equal(parsed)
  })

  it('Should serialize/deserialize/clone multiple types', () => {
    const input: IPersonAvroWrapper = {
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

    const clone = Person.clone(parsed)
    expect(clone).not.to.equal(parsed)
    expect(clone).to.deep.equal(parsed)
  })

  it('Should serialize/deserialize/clone namespaced types', () => {
    const human1: IHumanAvroWrapper = {
      firstname: 'Human1',
      lastname: 'Human1',
    }
    const human2: IHumanAvroWrapper = {
      firstname: 'Human2',
      lastname: 'Human2',
    }
    const input: IDogAvroWrapper = {
      name: 'Dog1',
      extra: [{ 'com.animals.Human': human1 }],
      owner: { 'com.animals.Human': human2 },
      friend: null,
      other: { 'com.animals.Human': human1 },
    }

    const parsed = Dog.deserialize(input)

    expect(parsed.owner).to.be.instanceOf(Human)
    expect(parsed.other).to.be.instanceOf(Human)
    expect(parsed.extra).to.have.length(1)
    expect(parsed.extra[0]).to.be.instanceOf(Human)
    expect(parsed.friend).to.be.eq(null)
    expect(Dog.serialize(parsed)).to.deep.equal(input)

    const clone = Dog.clone(parsed)
    expect(clone).not.to.equal(parsed)
    expect(clone).to.deep.equal(parsed)
  })

  it('Should serialize/deserialize/clone nested union types', () => {
    const input: ITreeAvroWrapper = {
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

    const clone = Tree.clone(parsed)
    expect(clone).not.to.equal(parsed)
    expect(clone).to.deep.equal(parsed)
  })
})
