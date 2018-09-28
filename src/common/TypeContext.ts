import {
  RecordType,
  getOptions,
  Options,
  NamedType,
  isUnion,
  isEnumType,
  isRecordType,
  isArrayType,
  isMapType,
  TypeOrRef,
  EnumType,
  ITypeContext,
  ICompilationUnit,
} from '../model'
import { FullyQualifiedNameStore } from './FullyQualifiedNameStore'
import { TypeByNameResolver } from './TypeByNameResolver'
import { nameComparator, alphaComparator, collectRecordTypes, collectEnumTypes, replaceReferences, fqn } from './utils'
import { AbstractNamespacedTypesProvider } from './AbstractNamespacedTypesProvider'

export class TypeContext extends AbstractNamespacedTypesProvider implements ITypeContext {
  private readonly _options: Options
  private readonly _unit: ICompilationUnit
  private readonly _rootType: RecordType

  constructor(unit: ICompilationUnit, options: Partial<Options>, autoresolve: boolean = true) {
    super()
    this._options = getOptions(options)
    this._rootType = JSON.parse(JSON.stringify(unit.rootType))
    this._unit = unit

    const fqns = new FullyQualifiedNameStore()
    TypeContext._addNamespacesToNamedTypes(this._rootType, null, fqns)
    this.getRecordTypes().forEach((record) => TypeContext._replaceRefsWithFullyQualifiedRefs(record, fqns))

    if (autoresolve) {
      const resolver = new TypeByNameResolver(this.getOptions())
      this.addTypes(resolver)
      this.resolveTypes(resolver)
    }
  }

  public getCompilationUnit(): ICompilationUnit {
    return this._unit
  }

  public getOptions(): Options {
    return this._options
  }

  public getRecordTypes(): RecordType[] {
    const recordTypes: RecordType[] = []
    collectRecordTypes(this._rootType, recordTypes)
    return recordTypes.sort(nameComparator)
  }

  public getEnumTypes(): EnumType[] {
    const enumTypes: EnumType[] = []
    collectEnumTypes(this._rootType, enumTypes)
    return enumTypes.sort(nameComparator)
  }

  public getNamedTypes(): NamedType[] {
    return []
      .concat(this.getRecordTypes())
      .concat(this.getEnumTypes())
      .sort(nameComparator)
  }

  public getNamespaces(): string[] {
    const withDuplicates = this.getNamedTypes().map(({ namespace }) => namespace)
    const uniques = new Set<string>(withDuplicates)
    return Array.from(uniques)
      .filter((namespace) => typeof namespace === 'string')
      .sort(alphaComparator)
  }

  public resolveTypes(resolver: TypeByNameResolver) {
    this.getRecordTypes().forEach((record) => TypeContext._resolveReferenceFullyQualifiedRefs(record, resolver))
  }

  public addTypes(resolver: TypeByNameResolver): void {
    this.getNamedTypes().forEach((type) => resolver.add(fqn(type), type))
  }

  private static _addNamespacesToNamedTypes(
    type: TypeOrRef,
    namespace: string,
    fqnResolver: FullyQualifiedNameStore,
  ): void {
    if (isUnion(type)) {
      type.forEach((tp) => TypeContext._addNamespacesToNamedTypes(tp, namespace, fqnResolver))
    } else if (isEnumType(type)) {
      type.namespace = type.namespace || namespace
      fqnResolver.add(type.namespace, type.name)
    } else if (isRecordType(type)) {
      type.namespace = type.namespace || namespace
      fqnResolver.add(type.namespace, type.name)
      type.fields.forEach((field) => TypeContext._addNamespacesToNamedTypes(field.type, type.namespace, fqnResolver))
    } else if (isArrayType(type)) {
      TypeContext._addNamespacesToNamedTypes(type.items, namespace, fqnResolver)
    } else if (isMapType(type)) {
      TypeContext._addNamespacesToNamedTypes(type.values, namespace, fqnResolver)
    }
  }

  private static _replaceRefsWithFullyQualifiedRefs(type: TypeOrRef, fqnResolver: FullyQualifiedNameStore): void {
    replaceReferences(type, (typeName) => fqnResolver.get(typeName))
  }

  private static _resolveReferenceFullyQualifiedRefs(type: TypeOrRef, nameToTypeMapping: TypeByNameResolver): void {
    replaceReferences(type, (fqn) => nameToTypeMapping.get(fqn))
  }
}
