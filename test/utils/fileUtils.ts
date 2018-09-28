import { RecordType } from '../../src/model'
import { readFileSync } from 'fs'
import { join } from 'path'

export function getSchema(name: string): RecordType {
  const path = join(__dirname, '../', `/schemas/${name}.avsc`)
  const stringContent = readFileSync(path, 'UTF8')
  return JSON.parse(stringContent)
}
