export type UnitOfDistance = 'miles' | 'yards' | 'km'

export interface Distance {
  amount: number
  unit: UnitOfDistance
}
