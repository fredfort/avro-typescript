import { RecordType, Options } from '../model'
import { getTypeSimilarityDiagnostics } from './getTypeSimilarityDiagnostics'
import { reportTypeSimilarityDiagnostics } from './reportTypeSimilarityDiagnostics'
import { TypeContext } from '../common/TypeContext'

export function performDiagnostics(filename: string, rootType: RecordType, options: Options): void {
  const context = new TypeContext({ filename, rootType }, options)
  const diagnostics = getTypeSimilarityDiagnostics(context.getRecordTypes(), context)
  const report = reportTypeSimilarityDiagnostics(filename, diagnostics)
  process.stderr.write(`${report}\n`)
}
