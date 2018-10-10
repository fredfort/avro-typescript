import chalk from 'chalk'
import { Similarity, TypeSimilarityDiagnostic } from '../model'

function getBaseMessage(similarity: Similarity): string {
  const commonMessage = chalk.gray('(these are indistinguishable at runtime)')
  switch (similarity) {
    case Similarity.FIELD_COUNT:
      return `multiple alternatives have the same number of fields with the same name(s) ${commonMessage}`
    case Similarity.NUMERIC:
      return `multiple alternatives are of numeric types ${commonMessage}`
  }
}

function generateSimilarityReport(diagnostic: TypeSimilarityDiagnostic): string {
  const alternativesStr = diagnostic.alternatives.map((alternative) => `    - ${chalk.gray(alternative)}`).join('\n')
  const qFieldName = `${chalk.red(diagnostic.typeName)}#${chalk.red(diagnostic.fieldName)}`
  return `  ${chalk.red('✖')} In field ${qFieldName} ${getBaseMessage(diagnostic.similarity)}:\n${alternativesStr}`
}

export function reportTypeSimilarityDiagnostics(filename: string, diagnostics: TypeSimilarityDiagnostic[]): string {
  if (diagnostics.length === 0) {
    return null
  }
  const reports = diagnostics.map(generateSimilarityReport).join('\n')
  return `Can't reliably generate ${chalk.bold.yellow('type guards')} from ${chalk.red(filename)} beacuse:\n${reports}`
}
