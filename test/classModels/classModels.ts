// Generated from array.avsc

export interface IRecordWithArrays {
  simpleArray: string[]
  multiTypeArray: (string | number)[]
}
export class RecordWithArrays implements IRecordWithArrays {
  public static FQN = 'RecordWithArrays'
  public readonly simpleArray: string[]
  public readonly multiTypeArray: (string | number)[]
  constructor(input: Partial<IRecordWithArrays>) {
    this.simpleArray = input.simpleArray
    this.multiTypeArray = input.multiTypeArray
  }
  public static deserialize(input: any): RecordWithArrays {
    return new RecordWithArrays({
      simpleArray: input.simpleArray.map((e) => e),
      multiTypeArray: input.multiTypeArray.map((e) => {
        return (() => {
          if (e['string'] !== undefined) {
            return e['string']
          } else if (e['int'] !== undefined) {
            return e['int']
          } else {
            throw new TypeError('Unresolvable type')
          }
        })()
      }),
    })
  }
  public static serialize(input: RecordWithArrays): object {
    return {
      simpleArray: input.simpleArray.map((e) => e),
      multiTypeArray: input.multiTypeArray.map((e) => {
        return (() => {
          if (typeof e === 'string') {
            return { string: e }
          } else if (typeof e === 'number' && e % 1 === 0) {
            return { int: e }
          } else {
            throw new TypeError('Unserializable type!')
          }
        })()
      }),
    }
  }
}
// Generated from enum.avsc

export type UnitOfDistance = 'miles' | 'yards' | 'km'
export interface IDistance {
  amount: number
  unit: UnitOfDistance
}
export class Distance implements IDistance {
  public static FQN = 'Distance'
  public readonly amount: number
  public readonly unit: UnitOfDistance
  constructor(input: Partial<IDistance>) {
    this.amount = input.amount
    this.unit = input.unit
  }
  public static deserialize(input: any): Distance {
    return new Distance({
      amount: input.amount,
      unit: input.unit,
    })
  }
  public static serialize(input: Distance): object {
    return {
      amount: input.amount,
      unit: input.unit,
    }
  }
}
// Generated from map.avsc

export interface IMapValue {
  value: { [index: string]: number }
}
export class MapValue implements IMapValue {
  public static FQN = 'MapValue'
  public readonly value: { [index: string]: number }
  constructor(input: Partial<IMapValue>) {
    this.value = input.value
  }
  public static deserialize(input: any): MapValue {
    return new MapValue({
      value: (() => {
        const keys = Object.keys(input.value)
        const output: { [index: string]: number } = {}
        for (let i = 0; i < keys.length; i += 1) {
          const mapKey = keys[i]
          const mapValue = input.value[mapKey]
          output[mapKey] = mapValue
        }
        return output
      })(),
    })
  }
  public static serialize(input: MapValue): object {
    return {
      value: (() => {
        const keys = Object.keys(input.value)
        const output: any = {}
        for (let i = 0; i < keys.length; i += 1) {
          const mapKey = keys[i]
          const mapValue = input.value[mapKey]
          output[mapKey] = mapValue
        }
        return output
      })(),
    }
  }
}
// Generated from multiple-type.avsc

export interface IAddress {
  city: string
  country: string
}
export interface IFullName {
  firstName: string
  lastName: string
}
export interface IPerson {
  fullname: IFullName
  addresses: IAddress[]
}
export class Address implements IAddress {
  public static FQN = 'Address'
  public readonly city: string
  public readonly country: string
  constructor(input: Partial<IAddress>) {
    this.city = input.city
    this.country = input.country
  }
  public static deserialize(input: any): Address {
    return new Address({
      city: input.city,
      country: input.country,
    })
  }
  public static serialize(input: Address): object {
    return {
      city: input.city,
      country: input.country,
    }
  }
}
export class FullName implements IFullName {
  public static FQN = 'FullName'
  public readonly firstName: string
  public readonly lastName: string
  constructor(input: Partial<IFullName>) {
    this.firstName = input.firstName
    this.lastName = input.lastName
  }
  public static deserialize(input: any): FullName {
    return new FullName({
      firstName: input.firstName,
      lastName: input.lastName,
    })
  }
  public static serialize(input: FullName): object {
    return {
      firstName: input.firstName,
      lastName: input.lastName,
    }
  }
}
export class Person implements IPerson {
  public static FQN = 'Person'
  public readonly fullname: IFullName
  public readonly addresses: IAddress[]
  constructor(input: Partial<IPerson>) {
    this.fullname = input.fullname
    this.addresses = input.addresses
  }
  public static deserialize(input: any): Person {
    return new Person({
      fullname: FullName.deserialize(input.fullname),
      addresses: input.addresses.map((e) => Address.deserialize(e)),
    })
  }
  public static serialize(input: Person): object {
    return {
      fullname: FullName.serialize(input.fullname),
      addresses: input.addresses.map((e) => Address.serialize(e)),
    }
  }
}
// Generated from namespace.avsc

export interface IDog {
  name: string
  owner: null | IHuman
  extra: (IHuman | IDog)[]
  friend: null | IDog
  other: null | IDog | IHuman
}
export interface IHuman {
  firstname: string
  lastname: string
}
export class Dog implements IDog {
  public static FQN = 'com.animals.Dog'
  public readonly name: string
  public readonly owner: null | IHuman
  public readonly extra: (IHuman | IDog)[]
  public readonly friend: null | IDog
  public readonly other: null | IDog | IHuman
  constructor(input: Partial<IDog>) {
    this.name = input.name
    this.owner = input.owner
    this.extra = input.extra
    this.friend = input.friend
    this.other = input.other
  }
  public static deserialize(input: any): Dog {
    return new Dog({
      name: input.name,
      owner: (() => {
        if (input.owner === null) {
          return null
        } else if (input.owner[Human.FQN] !== undefined) {
          return Human.deserialize(input.owner[Human.FQN])
        } else {
          throw new TypeError('Unresolvable type')
        }
      })(),
      extra: input.extra.map((e) => {
        return (() => {
          if (e[Human.FQN] !== undefined) {
            return Human.deserialize(e[Human.FQN])
          } else if (e[Dog.FQN] !== undefined) {
            return Dog.deserialize(e[Dog.FQN])
          } else {
            throw new TypeError('Unresolvable type')
          }
        })()
      }),
      friend: (() => {
        if (input.friend === null) {
          return null
        } else if (input.friend[Dog.FQN] !== undefined) {
          return Dog.deserialize(input.friend[Dog.FQN])
        } else {
          throw new TypeError('Unresolvable type')
        }
      })(),
      other: (() => {
        if (input.other === null) {
          return null
        } else if (input.other[Dog.FQN] !== undefined) {
          return Dog.deserialize(input.other[Dog.FQN])
        } else if (input.other[Human.FQN] !== undefined) {
          return Human.deserialize(input.other[Human.FQN])
        } else {
          throw new TypeError('Unresolvable type')
        }
      })(),
    })
  }
  public static serialize(input: Dog): object {
    return {
      name: input.name,
      owner: (() => {
        if (input.owner === null) {
          return null
        } else if (input.owner instanceof Human) {
          return { [Human.FQN]: Human.serialize(input.owner) }
        } else {
          throw new TypeError('Unserializable type!')
        }
      })(),
      extra: input.extra.map((e) => {
        return (() => {
          if (e instanceof Human) {
            return { [Human.FQN]: Human.serialize(e) }
          } else if (e instanceof Dog) {
            return { [Dog.FQN]: Dog.serialize(e) }
          } else {
            throw new TypeError('Unserializable type!')
          }
        })()
      }),
      friend: (() => {
        if (input.friend === null) {
          return null
        } else if (input.friend instanceof Dog) {
          return { [Dog.FQN]: Dog.serialize(input.friend) }
        } else {
          throw new TypeError('Unserializable type!')
        }
      })(),
      other: (() => {
        if (input.other === null) {
          return null
        } else if (input.other instanceof Dog) {
          return { [Dog.FQN]: Dog.serialize(input.other) }
        } else if (input.other instanceof Human) {
          return { [Human.FQN]: Human.serialize(input.other) }
        } else {
          throw new TypeError('Unserializable type!')
        }
      })(),
    }
  }
}
export class Human implements IHuman {
  public static FQN = 'com.animals.Human'
  public readonly firstname: string
  public readonly lastname: string
  constructor(input: Partial<IHuman>) {
    this.firstname = input.firstname
    this.lastname = input.lastname
  }
  public static deserialize(input: any): Human {
    return new Human({
      firstname: input.firstname,
      lastname: input.lastname,
    })
  }
  public static serialize(input: Human): object {
    return {
      firstname: input.firstname,
      lastname: input.lastname,
    }
  }
}
// Generated from primitive.avsc

export interface IRecordWithPrimitives {
  bool: boolean
  str: string
  long: number
  float: number
  double: number
  int: number
  other: null
}
export class RecordWithPrimitives implements IRecordWithPrimitives {
  public static FQN = 'RecordWithPrimitives'
  public readonly bool: boolean
  public readonly str: string
  public readonly long: number
  public readonly float: number
  public readonly double: number
  public readonly int: number
  public readonly other: null
  constructor(input: Partial<IRecordWithPrimitives>) {
    this.bool = input.bool
    this.str = input.str
    this.long = input.long
    this.float = input.float
    this.double = input.double
    this.int = input.int
    this.other = input.other
  }
  public static deserialize(input: any): RecordWithPrimitives {
    return new RecordWithPrimitives({
      bool: input.bool,
      str: input.str,
      long: input.long,
      float: input.float,
      double: input.double,
      int: input.int,
      other: input.other,
    })
  }
  public static serialize(input: RecordWithPrimitives): object {
    return {
      bool: input.bool,
      str: input.str,
      long: input.long,
      float: input.float,
      double: input.double,
      int: input.int,
      other: input.other,
    }
  }
}
