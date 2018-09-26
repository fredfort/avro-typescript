import { RecordType, Options, HasName, GeneratorContext } from '../model'
import { FqnResolver } from '../generators/FqnResolver'
import { addNamespaces } from '../generators/addNamespaces'
import { getAllEnumTypes, getAllRecordTypes, getNameToTypeMapping } from '../generators/generateAll'
import { getTypeSimilarityDiagnostics } from './getTypeSimilarityDiagnostics'
import { reportTypeSimilarityDiagnostics } from './reportTypeSimilarityDiagnostics'

export function performDiagnostics(filename: string, record: RecordType, options: Options): void {
  const context: GeneratorContext = {
    options,
    fqnResolver: new FqnResolver(),
    nameToTypeMapping: new Map(),
  }
  const type = addNamespaces(record, context)
  const enumTypes = getAllEnumTypes(type, [])
  const recordTypes = getAllRecordTypes(type, [])
  const allNamedTypes: HasName[] = [].concat(enumTypes, recordTypes)
  context.nameToTypeMapping = getNameToTypeMapping(allNamedTypes)

  const diagnostics = getTypeSimilarityDiagnostics(recordTypes, context)
  const report = reportTypeSimilarityDiagnostics(filename, diagnostics)
  process.stderr.write(`${report}\n`)
}
