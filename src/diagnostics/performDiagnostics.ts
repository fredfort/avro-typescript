import { RecordType, Options } from '../model'
import { getTypeSimilarityDiagnostics } from './getTypeSimilarityDiagnostics'
import { reportTypeSimilarityDiagnostics } from './reportTypeSimilarityDiagnostics'
import { TypeContext } from '../TypeContext'

export function performDiagnostics(filename: string, record: RecordType, options: Options): void {
  const context = new TypeContext(record, options)
  const diagnostics = getTypeSimilarityDiagnostics(context.getRecordTypes(), context)
  const report = reportTypeSimilarityDiagnostics(filename, diagnostics)
  process.stderr.write(`${report}\n`)
}
