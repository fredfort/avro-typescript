import { ITypeProvider, RecordType, EnumType, NamedType, Options } from '../model'
import { fqn } from './utils'

function matchesNamespace(ns: string) {
  return ({ namespace }: NamedType) => {
    if (ns === null || ns === undefined) {
      return namespace === null || namespace === undefined
    }
    return ns === namespace
  }
}

export abstract class AbstractNamespacedTypesProvider implements ITypeProvider {
  abstract getRecordTypes(): RecordType[]
  abstract getEnumTypes(): EnumType[]
  abstract getNamedTypes(): NamedType[]
  abstract getNamespaces(): string[]
  abstract getOptions(): Options

  public getEnumTypesInNamespace(namespace: string): EnumType[] {
    return this.getEnumTypes().filter(matchesNamespace(namespace))
  }
  public getRecordTypesInNamespace(namespace: string): RecordType[] {
    return this.getRecordTypes().filter(matchesNamespace(namespace))
  }
  public getNamedTypesInNamespace(namespace: string): NamedType[] {
    return this.getNamedTypes().filter(matchesNamespace(namespace))
  }
  public getEnumType(qualifiedName: string): EnumType {
    return this.getEnumTypes().find((e) => fqn(e) === qualifiedName)
  }
  public getRecordType(qualifiedName: string): RecordType {
    return this.getRecordTypes().find((e) => fqn(e) === qualifiedName)
  }
  public getNamedType(qualifiedName: string): NamedType {
    return this.getNamedTypes().find((e) => fqn(e) === qualifiedName)
  }
}
