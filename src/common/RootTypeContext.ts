import {
  IRootContext,
  ICompilationUnit,
  Options,
  getOptions,
  ITypeContext,
  EnumType,
  RecordType,
  NamedType,
} from '../model'
import { TypeContext } from './TypeContext'
import { TypeByNameResolver } from './TypeByNameResolver'
import { nameComparator, fqn } from './utils'
import { AbstractNamespacedTypesProvider } from './AbstractNamespacedTypesProvider'

export class RootTypeContext extends AbstractNamespacedTypesProvider implements IRootContext {
  private readonly _options: Options
  private readonly _compilationUnits: ICompilationUnit[]
  private readonly _typeContexts: TypeContext[]

  private _enumTypes: EnumType[]
  private _recordTypes: RecordType[]
  private _namedTypes: NamedType[]
  private _namespaces: string[]

  constructor(units: ICompilationUnit[], options: Partial<Options> = {}) {
    super()
    this._compilationUnits = units
    this._options = getOptions(options)
    this._typeContexts = this._compilationUnits.map((unit) => new TypeContext(unit, this.getOptions(), false))
    const resolver = new TypeByNameResolver(this.getOptions())
    this._typeContexts.forEach((context) => context.addTypes(resolver))
    this._typeContexts.forEach((context) => context.resolveTypes(resolver))

    this._enumTypes = this.collectUniqueTypes<EnumType>((context) => context.getEnumTypes(), resolver)
    this._recordTypes = this.collectUniqueTypes<RecordType>((context) => context.getRecordTypes(), resolver)
    this._namedTypes = []
      .concat(this.getRecordTypes())
      .concat(this.getEnumTypes())
      .sort(nameComparator)
  }

  public getTypeContexts(): ITypeContext[] {
    return this._typeContexts
  }

  public getCompilationUnits(): ICompilationUnit[] {
    return this._compilationUnits
  }

  public getOptions(): Options {
    return this._options
  }

  public getRecordTypes(): RecordType[] {
    return this._recordTypes
  }

  public getEnumTypes(): EnumType[] {
    return this._enumTypes
  }

  public getNamedTypes(): NamedType[] {
    return this._namedTypes
  }

  public getNamespaces(): string[] {
    if (!Array.isArray(this._namespaces)) {
      const withDuplicates = this.getNamedTypes().map(({ namespace }) => namespace)
      const uniquest = new Set<string>(withDuplicates)
      this._namespaces = Array.from(uniquest).filter((namespace) => typeof namespace === 'string')
    }
    return this._namespaces
  }

  private collectUniqueTypes<T extends NamedType>(getter: (c: ITypeContext) => T[], resolver: TypeByNameResolver): T[] {
    const nestedValues = this.getTypeContexts().map(getter)
    const nonUniqueNames = ([] as T[]).concat(...nestedValues).map(fqn)
    const uniqueNames = Array.from(new Set(nonUniqueNames))
    const typesFromResolver = uniqueNames.map((name) => resolver.get(name) as T).sort(nameComparator)
    return typesFromResolver
  }
}
