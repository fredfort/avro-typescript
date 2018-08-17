export interface FullName {
  firstName: string
  lastName: string
}

export interface Address {
  city: string
  country: string
}

export interface Person {
  fullname: FullName
  addresses: Address[]
}
