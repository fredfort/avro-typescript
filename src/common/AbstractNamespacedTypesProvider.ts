import { ITypeProvider, RecordType, EnumType, NamedType, Options } from '../model'
import { fqn } from './utils'

export abstract class AbstractNamespacedTypesProvider implements ITypeProvider {
  abstract getRecordTypes(): RecordType[]
  abstract getEnumTypes(): EnumType[]
  abstract getNamedTypes(): NamedType[]
  abstract getNamespaces(): string[]
  abstract getOptions(): Options

  public getEnumTypesInNamespace(namespace: string): EnumType[] {
    return this.getEnumTypes().filter(({ namespace: ns }) => ns === namespace)
  }
  public getRecordTypesInNamespace(namespace: string): RecordType[] {
    return this.getRecordTypes().filter(({ namespace: ns }) => ns === namespace)
  }
  public getNamedTypesInNamespace(namespace: string): NamedType[] {
    return this.getNamedTypes().filter(({ namespace: ns }) => ns === namespace)
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
