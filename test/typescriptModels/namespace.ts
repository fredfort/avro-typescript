export interface Human {
  firstname: string
  lastname: string
}

export interface Dog {
  name: string
  owner?: null | undefined | Human
  extra: (Human | Dog)[]
  friend?: null | undefined | Dog
  other?: null | undefined | Dog | Human
}
