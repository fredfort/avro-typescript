import { generateInterface } from './generateInterface'
import { generateClass } from './generateClass'
import { generateEnumType } from './generateEnum'
import { generateAvroWrapper } from './generateAvroWrapper'
import { alphaComparator } from './utils'
import { RecordType, EnumType } from '../model'
import { GeneratorContext } from './typings'

export function generateContent(recordTypes: RecordType[], enumTypes: EnumType[], context: GeneratorContext) {
  const sortedEnums = enumTypes.sort(alphaComparator)
  const sortedRecords = recordTypes.sort(alphaComparator)

  const enums = sortedEnums.map((t) => generateEnumType(t, context))
  const interfaces = sortedRecords.map((t) => generateInterface(t, context))
  const avroWrappers = sortedRecords.map((t) => generateAvroWrapper(t, context))
  const classes = sortedRecords.map((t) => generateClass(t, context))
  return []
    .concat(enums)
    .concat(interfaces)
    .concat(avroWrappers)
    .concat(classes)
    .join('\n')
}
