import { FqnResolver } from './FqnResolver'
import { HasName } from '../model'

export interface GeneratorContext {
  fqnResolver: FqnResolver
  nameToTypeMapping: Map<string, HasName>
}
