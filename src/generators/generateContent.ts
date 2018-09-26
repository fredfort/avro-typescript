import { generateInterface } from './generateInterface'
import { generateClass } from './generateClass'
import { generateEnumType } from './generateEnum'
import { generateAvroWrapper } from './generateAvroWrapper'
import { alphaComparator } from './utils'
import { RecordType, EnumType, HasName, TypeVariant, GeneratorContext } from '../model'
import { generateFqnConstant } from './generateFqnConstants'
import { generateTypeGuard } from './generateTypeGuard'
import { generateDeserialize } from './generateDeserialize'
import { generateSerialize } from './generateSerialize'

export function generateContent(recordTypes: RecordType[], enumTypes: EnumType[], context: GeneratorContext) {
  const sortedEnums = enumTypes.sort(alphaComparator)
  const sortedRecords = recordTypes.sort(alphaComparator)
  const all: HasName[] = [].concat(sortedEnums, sortedRecords)

  const fqns = context.options.namespaces ? [] : all.map(generateFqnConstant)
  const enums = sortedEnums.map((t) => generateEnumType(t, context))
  const interfaces = sortedRecords.map((t) => generateInterface(t, context))
  const avroWrappers = sortedRecords.map((t) => generateAvroWrapper(t, context))

  switch (context.options.types) {
    case TypeVariant.CLASSES: {
      const classes = sortedRecords.map((t) => generateClass(t, context))
      return []
        .concat(fqns)
        .concat(enums)
        .concat(interfaces)
        .concat(avroWrappers)
        .concat(classes)
        .join('\n')
    }
    case TypeVariant.INTERFACES_ONLY: {
      const typeGuards = sortedRecords.map((t) => generateTypeGuard(t, context))
      const deserializers = sortedRecords.map((t) => generateDeserialize(t, context))
      const serializers = sortedRecords.map((t) => generateSerialize(t, context))
      return []
        .concat(fqns)
        .concat(enums)
        .concat(interfaces)
        .concat(avroWrappers)
        .concat(typeGuards)
        .concat(deserializers)
        .concat(serializers)
        .join('\n')
    }
  }
}
