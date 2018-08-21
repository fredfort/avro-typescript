export interface Person {
  firstname: string
  lastname: string
}

export interface Dog {
  name: string
  owner: Person
  extra: (Person | Dog)[]
  friend: Dog
  other: Dog | Person
}
