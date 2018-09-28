import { NamedType, Options, DuplicateTypeResolutionStrategy, isEnumType, isRecordType } from '../model'
import { setsEqual } from './utils'

export class TypeByNameResolver {
  private readonly mapping: Map<string, NamedType>
  private readonly options: Options

  constructor(options: Options) {
    this.mapping = new Map()
    this.options = options
  }

  add(fqn: string, type: NamedType): void {
    if (this.mapping.has(fqn)) {
      return this.resolveDuplicateTypeBasedOnStrategy(fqn, type)
    }
    this.mapping.set(fqn, type)
  }

  get(fqn: string): NamedType {
    return this.mapping.get(fqn)
  }

  private resolveDuplicateTypeBasedOnStrategy(fqn: string, type: NamedType) {
    switch (this.options.duplicateTypeResolutionStrategy) {
      case DuplicateTypeResolutionStrategy.FAIL: {
        throw new TypeError(`Duplicate qualified name in 2 or more schemas ${fqn}!`)
      }
      case DuplicateTypeResolutionStrategy.BEST_EFFORT: {
        TypeByNameResolver.compareTypes(fqn, this.mapping.get(fqn), type)
      }
    }
  }

  private static compareTypes(fqn: string, oldType: NamedType, newType: NamedType): void {
    if (oldType.type !== newType.type) {
      throw new TypeError(
        `Type "${fqn}" has 2 versions with different types which are "${oldType.type}" and "${newType.type}"`,
      )
    }
    if (isEnumType(oldType) && isEnumType(newType)) {
      const oldTypeSymbols = new Set(oldType.symbols)
      const newTypeSymbols = new Set(newType.symbols)
      if (!setsEqual(oldTypeSymbols, newTypeSymbols)) {
        const oldSymbols = oldType.symbols.map((s) => `"${s}"`).join(', ')
        const newSymbols = newType.symbols.map((s) => `"${s}"`).join(', ')
        throw new TypeError(
          `Enum type "${fqn}" has 2 versions with different literals: ${oldSymbols} and ${newSymbols}`,
        )
      }
    }
    if (isRecordType(oldType) && isRecordType(newType)) {
      const oldFields = new Set(oldType.fields.map((f) => f.name))
      const newFields = new Set(newType.fields.map((f) => f.name))
      if (!setsEqual(oldFields, newFields)) {
        const oldFieldNames = Array.from(oldFields)
          .map((s) => `"${s}"`)
          .join(', ')
        const newFieldNames = Array.from(newFields)
          .map((s) => `"${s}"`)
          .join(', ')
        throw new TypeError(
          `Record type "${fqn}" has 2 versions with different field names: ${oldFieldNames} and ${newFieldNames}`,
        )
      }
    }
  }
}
