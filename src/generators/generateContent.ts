import { generateInterface } from './generateInterface'
import { generateClass } from './generateClass'
import { generateEnumType } from './generateEnum'
import { generateAvroWrapper } from './generateAvroWrapper'
import { alphaComparator } from './utils'
import { RecordType, EnumType, HasName } from '../model'
import { GeneratorContext } from './typings'
import { generateFqnConstant } from './generateFqnConstants'

export function generateContent(recordTypes: RecordType[], enumTypes: EnumType[], context: GeneratorContext) {
  const sortedEnums = enumTypes.sort(alphaComparator)
  const sortedRecords = recordTypes.sort(alphaComparator)
  const all: HasName[] = [].concat(sortedEnums, sortedRecords)

  const fqns = context.options.removeNameSpace ? all.map(generateFqnConstant) : []
  const enums = sortedEnums.map((t) => generateEnumType(t, context))
  const interfaces = sortedRecords.map((t) => generateInterface(t, context))
  const avroWrappers = sortedRecords.map((t) => generateAvroWrapper(t, context))
  const classes = sortedRecords.map((t) => generateClass(t, context))
  return []
    .concat(fqns)
    .concat(enums)
    .concat(interfaces)
    .concat(avroWrappers)
    .concat(classes)
    .join('\n')
}
