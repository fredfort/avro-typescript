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
  isPrimitive,
  EnumType,
  ITypeContext,
  NameOrType,
} from './model'
import { FqnResolver } from './generators/FqnResolver'

type LocalReplacer = (t: NameOrType) => void
type TypeReplacer = (s: string) => NameOrType

export class TypeContext implements ITypeContext {
  private readonly _rootType: RecordType
  private readonly _options: Options

  private _enumTypes: EnumType[]
  private _recordTypes: RecordType[]
  private _namedTypes: NamedType[]
  private _namespaces: string[]

  constructor(root: RecordType, options: Partial<Options>) {
    this._options = getOptions(options)
    this._rootType = JSON.parse(JSON.stringify(root))

    const fqnResolver = new FqnResolver()
    TypeContext._addNamespacesToNamedTypes(this._rootType, null, fqnResolver)
    this.getRecordTypes().forEach((record) => TypeContext._replaceRefsWithFullyQualifiedRefs(record, fqnResolver))

    const nameToTypeMapping = TypeContext._buildNameToTypeMapping(this.getNamedTypes())
    this.getRecordTypes().forEach((record) =>
      TypeContext._resolveReferenceFullyQualifiedRefs(record, nameToTypeMapping),
    )
  }

  public getOptions(): Options {
    return this._options
  }

  public getRootType(): RecordType {
    return this._rootType
  }

  public getRecordTypes(): RecordType[] {
    if (!Array.isArray(this._recordTypes)) {
      this._recordTypes = []
      TypeContext._getAllRecordTypes(this._rootType, this._recordTypes)
      this._recordTypes = this._recordTypes.sort(TypeContext.alphaComparator)
    }
    return this._recordTypes
  }

  public getEnumTypes(): EnumType[] {
    if (!Array.isArray(this._enumTypes)) {
      this._enumTypes = []
      TypeContext._getAllEnumTypes(this._rootType, this._enumTypes)
      this._enumTypes = this._enumTypes.sort(TypeContext.alphaComparator)
    }
    return this._enumTypes
  }

  public getNamedTypes(): NamedType[] {
    if (!Array.isArray(this._namedTypes)) {
      this._namedTypes = []
        .concat(this.getRecordTypes())
        .concat(this.getEnumTypes())
        .sort(TypeContext.alphaComparator)
    }
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

  public getEnumTypesInNamespace(namespace: string): EnumType[] {
    return this.getEnumTypes().filter(({ namespace: ns }) => ns === namespace)
  }

  public getRecordTypesInNamespace(namespace: string): RecordType[] {
    return this.getRecordTypes().filter(({ namespace: ns }) => ns === namespace)
  }

  public getNamedTypesInNamespace(namespace: string): NamedType[] {
    return this.getNamedTypes().filter(({ namespace: ns }) => ns === namespace)
  }

  private static _addNamespacesToNamedTypes(type: TypeOrRef, namespace: string, fqnResolver: FqnResolver): void {
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

  private static _replaceRefsWithFullyQualifiedRefs(type: TypeOrRef, fqnResolver: FqnResolver): void {
    TypeContext._replaceReferences(type, (typeName) => fqnResolver.get(typeName))
  }

  private static _resolveReferenceFullyQualifiedRefs(type: TypeOrRef, nameToTypeMapping: Map<string, NamedType>): void {
    TypeContext._replaceReferences(type, (fqn) => nameToTypeMapping.get(fqn))
  }

  private static _replaceRefsHelper(type: TypeOrRef, replaceLocal: LocalReplacer, replacer: TypeReplacer): void {
    if (typeof type === 'string' && !isPrimitive(type)) {
      const newType = replacer(type)
      replaceLocal(newType)
    } else if (isUnion(type) || isArrayType(type) || isMapType(type)) {
      TypeContext._replaceReferences(type, replacer)
    }
  }

  private static _replaceReferences(type: TypeOrRef, replacer: (typeName: string) => NameOrType): void {
    if (isUnion(type)) {
      type.forEach((optionType, i) => {
        TypeContext._replaceRefsHelper(optionType, (newValue) => (type[i] = newValue), replacer)
      })
    } else if (isRecordType(type)) {
      type.fields.forEach((field) => {
        TypeContext._replaceRefsHelper(field.type, (newValue) => (field.type = newValue), replacer)
      })
    } else if (isArrayType(type)) {
      TypeContext._replaceRefsHelper(type.items, (newValue) => (type.items = newValue), replacer)
    } else if (isMapType(type)) {
      TypeContext._replaceRefsHelper(type.values, (newValue) => (type.values = newValue), replacer)
    }
  }

  private static _getAllRecordTypes(type: TypeOrRef, accumulatedTypes: RecordType[]): void {
    if (isRecordType(type)) {
      accumulatedTypes.push(type)
      type.fields.forEach((field) => TypeContext._getAllRecordTypes(field.type, accumulatedTypes))
    } else if (isUnion(type)) {
      type.forEach((optionType) => TypeContext._getAllRecordTypes(optionType, accumulatedTypes))
    } else if (isArrayType(type)) {
      TypeContext._getAllRecordTypes(type.items, accumulatedTypes)
    } else if (isMapType(type)) {
      TypeContext._getAllRecordTypes(type.values, accumulatedTypes)
    }
  }

  private static _getAllEnumTypes(type: TypeOrRef, accumulatedTypes: EnumType[]): void {
    if (isEnumType(type)) {
      accumulatedTypes.push(type)
    } else if (isUnion(type)) {
      type.forEach((optionType) => TypeContext._getAllEnumTypes(optionType, accumulatedTypes))
    } else if (isRecordType(type)) {
      type.fields.forEach((field) => TypeContext._getAllEnumTypes(field.type, accumulatedTypes))
    } else if (isArrayType(type)) {
      TypeContext._getAllEnumTypes(type.items, accumulatedTypes)
    } else if (isMapType(type)) {
      TypeContext._getAllEnumTypes(type.values, accumulatedTypes)
    }
  }

  private static _buildNameToTypeMapping(types: NamedType[]): Map<string, NamedType> {
    return new Map(types.map((type) => [TypeContext._fqn(type), type] as [string, NamedType]))
  }

  private static _fqn(type: NamedType): string {
    return `${type.namespace}.${type.name}`
  }

  private static alphaComparator(a: NamedType, b: NamedType) {
    if (a.name < b.name) {
      return -1
    } else if (a.name > b.name) {
      return 1
    }
    return 0
  }
}
