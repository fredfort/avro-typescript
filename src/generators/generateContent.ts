import { generateInterface } from './generateInterface'
import { generateClass } from './generateClass'
import { generateEnumType } from './generateEnum'
import { generateAvroWrapper } from './generateAvroWrapper'
import { TypeVariant, ITypeContext, RecordType, EnumType } from '../model'
import { generateFqnConstant } from './generateFqnConstants'
import { generateTypeGuard } from './generateTypeGuard'
import { generateDeserialize } from './generateDeserialize'
import { generateSerialize } from './generateSerialize'

export function generateContent(recordTypes: RecordType[], enumTypes: EnumType[], context: ITypeContext) {
  const fqns = context.getOptions().namespaces ? [] : context.getNamedTypes().map(generateFqnConstant)
  const enums = enumTypes.map((t) => generateEnumType(t, context))
  const interfaces = recordTypes.map((t) => generateInterface(t, context))
  const avroWrappers = recordTypes.map((t) => generateAvroWrapper(t, context))

  switch (context.getOptions().types) {
    case TypeVariant.CLASSES: {
      const classes = recordTypes.map((t) => generateClass(t, context))
      return []
        .concat(fqns)
        .concat(enums)
        .concat(interfaces)
        .concat(avroWrappers)
        .concat(classes)
        .join('\n')
    }
    case TypeVariant.INTERFACES_ONLY: {
      const typeGuards = recordTypes.map((t) => generateTypeGuard(t, context))
      const deserializers = recordTypes.map((t) => generateDeserialize(t, context))
      const serializers = recordTypes.map((t) => generateSerialize(t, context))
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
