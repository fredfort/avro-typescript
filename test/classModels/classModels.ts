// Generated from array.avsc

export interface IRecordWithArrays {
  simpleArray: string[];
  multiTypeArray: (string | number)[];
}
export interface IRecordWithArraysAvroWrapper {
  simpleArray: string[];
  multiTypeArray: ({
    string?: string;
    int?: number;
  })[];
}
export class RecordWithArrays implements IRecordWithArrays {
  public simpleArray: string[];
  public multiTypeArray: (string | number)[];
  constructor(input: Partial<IRecordWithArrays>) {
    this.simpleArray = input.simpleArray;
    this.multiTypeArray = input.multiTypeArray;
  }
  public static deserialize(input: IRecordWithArraysAvroWrapper): RecordWithArrays {
    return new RecordWithArrays({
      simpleArray: input.simpleArray.map((e) => e),
      multiTypeArray: input.multiTypeArray.map((e) => {
        return (() => {
          if (e['string'] !== undefined) {
            return e['string'];
          } else if (e['int'] !== undefined) {
            return e['int'];
          }
          throw new TypeError('Unresolvable type');
        })();
      }),
    });
  }
  public static serialize(input: RecordWithArrays): IRecordWithArraysAvroWrapper {
    return {
      simpleArray: input.simpleArray.map((e) => e),
      multiTypeArray: input.multiTypeArray.map((e) => {
        return (() => {
          if (typeof e === 'string') {
            return { string: e };
          } else if (typeof e === 'number' && e % 1 === 0) {
            return { int: e };
          }
          throw new TypeError('Unserializable type!');
        })();
      }),
    };
  }
}

// Generated from enum.avsc

export enum UnitOfDistance {
  miles = 'miles',
  yards = 'yards',
  km = 'km',
}
export interface IDistance {
  amount: number;
  unit: UnitOfDistance;
}
export interface IDistanceAvroWrapper {
  amount: number;
  unit: UnitOfDistance;
}
export class Distance implements IDistance {
  public amount: number;
  public unit: UnitOfDistance;
  constructor(input: Partial<IDistance>) {
    this.amount = input.amount;
    this.unit = input.unit;
  }
  public static deserialize(input: IDistanceAvroWrapper): Distance {
    return new Distance({
      amount: input.amount,
      unit: input.unit,
    });
  }
  public static serialize(input: Distance): IDistanceAvroWrapper {
    return {
      amount: input.amount,
      unit: input.unit,
    };
  }
}

// Generated from map.avsc

export interface IMapValue {
  value: { [index: string]: number };
}
export interface IMapValueAvroWrapper {
  value: { [index: string]: number };
}
export class MapValue implements IMapValue {
  public value: { [index: string]: number };
  constructor(input: Partial<IMapValue>) {
    this.value = input.value;
  }
  public static deserialize(input: IMapValueAvroWrapper): MapValue {
    return new MapValue({
      value: (() => {
        const keys = Object.keys(input.value);
        const output: { [index: string]: number } = {};
        for (let i = 0; i < keys.length; i += 1) {
          const mapKey = keys[i];
          const mapValue = input.value[mapKey];
          output[mapKey] = mapValue;
        }
        return output;
      })(),
    });
  }
  public static serialize(input: MapValue): IMapValueAvroWrapper {
    return {
      value: (() => {
        const keys = Object.keys(input.value);
        const output: { [index: string]: number } = {};
        for (let i = 0; i < keys.length; i += 1) {
          const mapKey = keys[i];
          const mapValue = input.value[mapKey];
          output[mapKey] = mapValue;
        }
        return output;
      })(),
    };
  }
}

// Generated from multiple-type.avsc

export interface IAddress {
  city: string;
  country: string;
}
export interface IFullName {
  firstName: string;
  lastName: string;
}
export interface IPerson {
  fullname: IFullName;
  addresses: IAddress[];
}
export interface IAddressAvroWrapper {
  city: string;
  country: string;
}
export interface IFullNameAvroWrapper {
  firstName: string;
  lastName: string;
}
export interface IPersonAvroWrapper {
  fullname: IFullNameAvroWrapper;
  addresses: IAddressAvroWrapper[];
}
export class Address implements IAddress {
  public city: string;
  public country: string;
  constructor(input: Partial<IAddress>) {
    this.city = input.city;
    this.country = input.country;
  }
  public static deserialize(input: IAddressAvroWrapper): Address {
    return new Address({
      city: input.city,
      country: input.country,
    });
  }
  public static serialize(input: Address): IAddressAvroWrapper {
    return {
      city: input.city,
      country: input.country,
    };
  }
}
export class FullName implements IFullName {
  public firstName: string;
  public lastName: string;
  constructor(input: Partial<IFullName>) {
    this.firstName = input.firstName;
    this.lastName = input.lastName;
  }
  public static deserialize(input: IFullNameAvroWrapper): FullName {
    return new FullName({
      firstName: input.firstName,
      lastName: input.lastName,
    });
  }
  public static serialize(input: FullName): IFullNameAvroWrapper {
    return {
      firstName: input.firstName,
      lastName: input.lastName,
    };
  }
}
export class Person implements IPerson {
  public fullname: IFullName;
  public addresses: IAddress[];
  constructor(input: Partial<IPerson>) {
    this.fullname = input.fullname;
    this.addresses = input.addresses;
  }
  public static deserialize(input: IPersonAvroWrapper): Person {
    return new Person({
      fullname: FullName.deserialize(input.fullname),
      addresses: input.addresses.map((e) => Address.deserialize(e)),
    });
  }
  public static serialize(input: Person): IPersonAvroWrapper {
    return {
      fullname: FullName.serialize(input.fullname),
      addresses: input.addresses.map((e) => Address.serialize(e)),
    };
  }
}

// Generated from namespace.avsc

export interface IDog {
  name: string;
  owner: null | IHuman;
  extra: (IHuman | IDog)[];
  friend: null | IDog;
  other: null | IDog | IHuman;
}
export interface IHuman {
  firstname: string;
  lastname: string;
}
export interface IDogAvroWrapper {
  name: string;
  owner: {
    'com.animals.Human'?: IHumanAvroWrapper;
  } | null;
  extra: ({
    'com.animals.Human'?: IHumanAvroWrapper;
    'com.animals.Dog'?: IDogAvroWrapper;
  })[];
  friend: {
    'com.animals.Dog'?: IDogAvroWrapper;
  } | null;
  other: {
    'com.animals.Dog'?: IDogAvroWrapper;
    'com.animals.Human'?: IHumanAvroWrapper;
  } | null;
}
export interface IHumanAvroWrapper {
  firstname: string;
  lastname: string;
}
export class Dog implements IDog {
  public name: string;
  public owner: null | IHuman;
  public extra: (IHuman | IDog)[];
  public friend: null | IDog;
  public other: null | IDog | IHuman;
  constructor(input: Partial<IDog>) {
    this.name = input.name;
    this.owner = input.owner;
    this.extra = input.extra;
    this.friend = input.friend;
    this.other = input.other;
  }
  public static deserialize(input: IDogAvroWrapper): Dog {
    return new Dog({
      name: input.name,
      owner: (() => {
        if (input.owner === null) {
          return null;
        } else if (input.owner['com.animals.Human'] !== undefined) {
          return Human.deserialize(input.owner['com.animals.Human']);
        }
        throw new TypeError('Unresolvable type');
      })(),
      extra: input.extra.map((e) => {
        return (() => {
          if (e['com.animals.Human'] !== undefined) {
            return Human.deserialize(e['com.animals.Human']);
          } else if (e['com.animals.Dog'] !== undefined) {
            return Dog.deserialize(e['com.animals.Dog']);
          }
          throw new TypeError('Unresolvable type');
        })();
      }),
      friend: (() => {
        if (input.friend === null) {
          return null;
        } else if (input.friend['com.animals.Dog'] !== undefined) {
          return Dog.deserialize(input.friend['com.animals.Dog']);
        }
        throw new TypeError('Unresolvable type');
      })(),
      other: (() => {
        if (input.other === null) {
          return null;
        } else if (input.other['com.animals.Dog'] !== undefined) {
          return Dog.deserialize(input.other['com.animals.Dog']);
        } else if (input.other['com.animals.Human'] !== undefined) {
          return Human.deserialize(input.other['com.animals.Human']);
        }
        throw new TypeError('Unresolvable type');
      })(),
    });
  }
  public static serialize(input: Dog): IDogAvroWrapper {
    return {
      name: input.name,
      owner: (() => {
        if (input.owner === null) {
          return null;
        } else if (input.owner instanceof Human) {
          return { 'com.animals.Human': Human.serialize(input.owner) };
        }
        throw new TypeError('Unserializable type!');
      })(),
      extra: input.extra.map((e) => {
        return (() => {
          if (e instanceof Human) {
            return { 'com.animals.Human': Human.serialize(e) };
          } else if (e instanceof Dog) {
            return { 'com.animals.Dog': Dog.serialize(e) };
          }
          throw new TypeError('Unserializable type!');
        })();
      }),
      friend: (() => {
        if (input.friend === null) {
          return null;
        } else if (input.friend instanceof Dog) {
          return { 'com.animals.Dog': Dog.serialize(input.friend) };
        }
        throw new TypeError('Unserializable type!');
      })(),
      other: (() => {
        if (input.other === null) {
          return null;
        } else if (input.other instanceof Dog) {
          return { 'com.animals.Dog': Dog.serialize(input.other) };
        } else if (input.other instanceof Human) {
          return { 'com.animals.Human': Human.serialize(input.other) };
        }
        throw new TypeError('Unserializable type!');
      })(),
    };
  }
}
export class Human implements IHuman {
  public firstname: string;
  public lastname: string;
  constructor(input: Partial<IHuman>) {
    this.firstname = input.firstname;
    this.lastname = input.lastname;
  }
  public static deserialize(input: IHumanAvroWrapper): Human {
    return new Human({
      firstname: input.firstname,
      lastname: input.lastname,
    });
  }
  public static serialize(input: Human): IHumanAvroWrapper {
    return {
      firstname: input.firstname,
      lastname: input.lastname,
    };
  }
}

// Generated from nested-union.avsc

export interface ILeaf {
  value: string;
}
export interface ITree {
  left: null | ITree | ILeaf;
  right: null | ITree | ILeaf;
}
export interface ILeafAvroWrapper {
  value: string;
}
export interface ITreeAvroWrapper {
  left: {
    'com.company.Tree'?: ITreeAvroWrapper;
    'com.company.Leaf'?: ILeafAvroWrapper;
  } | null;
  right: {
    'com.company.Tree'?: ITreeAvroWrapper;
    'com.company.Leaf'?: ILeafAvroWrapper;
  } | null;
}
export class Leaf implements ILeaf {
  public value: string;
  constructor(input: Partial<ILeaf>) {
    this.value = input.value;
  }
  public static deserialize(input: ILeafAvroWrapper): Leaf {
    return new Leaf({
      value: input.value,
    });
  }
  public static serialize(input: Leaf): ILeafAvroWrapper {
    return {
      value: input.value,
    };
  }
}
export class Tree implements ITree {
  public left: null | ITree | ILeaf;
  public right: null | ITree | ILeaf;
  constructor(input: Partial<ITree>) {
    this.left = input.left;
    this.right = input.right;
  }
  public static deserialize(input: ITreeAvroWrapper): Tree {
    return new Tree({
      left: (() => {
        if (input.left === null) {
          return null;
        } else if (input.left['com.company.Tree'] !== undefined) {
          return Tree.deserialize(input.left['com.company.Tree']);
        } else if (input.left['com.company.Leaf'] !== undefined) {
          return Leaf.deserialize(input.left['com.company.Leaf']);
        }
        throw new TypeError('Unresolvable type');
      })(),
      right: (() => {
        if (input.right === null) {
          return null;
        } else if (input.right['com.company.Tree'] !== undefined) {
          return Tree.deserialize(input.right['com.company.Tree']);
        } else if (input.right['com.company.Leaf'] !== undefined) {
          return Leaf.deserialize(input.right['com.company.Leaf']);
        }
        throw new TypeError('Unresolvable type');
      })(),
    });
  }
  public static serialize(input: Tree): ITreeAvroWrapper {
    return {
      left: (() => {
        if (input.left === null) {
          return null;
        } else if (input.left instanceof Tree) {
          return { 'com.company.Tree': Tree.serialize(input.left) };
        } else if (input.left instanceof Leaf) {
          return { 'com.company.Leaf': Leaf.serialize(input.left) };
        }
        throw new TypeError('Unserializable type!');
      })(),
      right: (() => {
        if (input.right === null) {
          return null;
        } else if (input.right instanceof Tree) {
          return { 'com.company.Tree': Tree.serialize(input.right) };
        } else if (input.right instanceof Leaf) {
          return { 'com.company.Leaf': Leaf.serialize(input.right) };
        }
        throw new TypeError('Unserializable type!');
      })(),
    };
  }
}

// Generated from primitive.avsc

export interface IRecordWithPrimitives {
  bool: boolean;
  str: string;
  long: number;
  float: number;
  double: number;
  int: number;
  other: null;
}
export interface IRecordWithPrimitivesAvroWrapper {
  bool: boolean;
  str: string;
  long: number;
  float: number;
  double: number;
  int: number;
  other: null;
}
export class RecordWithPrimitives implements IRecordWithPrimitives {
  public bool: boolean;
  public str: string;
  public long: number;
  public float: number;
  public double: number;
  public int: number;
  public other: null;
  constructor(input: Partial<IRecordWithPrimitives>) {
    this.bool = input.bool;
    this.str = input.str;
    this.long = input.long;
    this.float = input.float;
    this.double = input.double;
    this.int = input.int;
    this.other = input.other;
  }
  public static deserialize(input: IRecordWithPrimitivesAvroWrapper): RecordWithPrimitives {
    return new RecordWithPrimitives({
      bool: input.bool,
      str: input.str,
      long: input.long,
      float: input.float,
      double: input.double,
      int: input.int,
      other: input.other,
    });
  }
  public static serialize(input: RecordWithPrimitives): IRecordWithPrimitivesAvroWrapper {
    return {
      bool: input.bool,
      str: input.str,
      long: input.long,
      float: input.float,
      double: input.double,
      int: input.int,
      other: input.other,
    };
  }
}
