import { RecordType, Options } from '../model'
import { generateContent } from './generateContent'
import { generateNamespace } from './generateNamespace'
import { TypeContext } from '../TypeContext'

export function generateAll(record: RecordType, options: Partial<Options>): string {
  const context = new TypeContext(record, options)
  if (options.namespaces) {
    return context
      .getNamespaces()
      .map((namespace) => generateNamespace(namespace, context))
      .join('\n')
  } else {
    return generateContent(context.getRecordTypes(), context.getEnumTypes(), context)
  }
}
