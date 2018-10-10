import { Options, ICompilationUnit } from '../model'
import { generateContent } from './generateContent'
import { generateNamespace } from './generateNamespace'
import { RootTypeContext } from '../common/RootTypeContext'

export function generateAll(units: ICompilationUnit[], options: Partial<Options> = {}): string {
  const context = new RootTypeContext(units, options)
  if (options.namespaces) {
    return context
      .getNamespaces()
      .map((namespace) => generateNamespace(namespace, context))
      .join('\n')
  } else {
    return generateContent(context.getRecordTypes(), context.getEnumTypes(), context)
  }
}
