import * as fs from 'fs'
import { avroToTypeScript } from './index'

const schema = JSON.parse(
  fs.readFileSync(__dirname + `/../src/example.avsc`, 'UTF8'),
)
console.log(
  avroToTypeScript(schema, { convertEnumToType: true, removeNameSpace: true }),
)
