import { generateInterface } from './generateInterface'
import { generateClass } from './generateClass'
import { generateEnumType } from './generateEnum'
import { alphaComparator } from './utils'
import { RecordType, EnumType } from '../model'
import { GeneratorContext } from './typings'

export function generateContent(recordTypes: RecordType[], enumTypes: EnumType[], context: GeneratorContext) {
  const sortedEnums = enumTypes.sort(alphaComparator)
  const sortedRecords = recordTypes.sort(alphaComparator)

  const enums = sortedEnums.map((t) => generateEnumType(t, context))
  const interfaces = sortedRecords.map((t) => generateInterface(t, context))
  const classes = sortedRecords.map((t) => generateClass(t, context))
  return []
    .concat(enums)
    .concat(interfaces)
    .concat(classes)
    .join('\n')
}
