import { FqnResolver } from './FqnResolver'
import { HasName, Options } from '../model'

export interface GeneratorContext {
  fqnResolver: FqnResolver
  nameToTypeMapping: Map<string, HasName>
  options: Options
}
