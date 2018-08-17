import * as fs from 'fs'
import { avroToTypeScript, RecordType } from '../src/'

function clean(value: string): string {
  return value.replace(/[\s]/g, '')
}

export function getSchema(name: string): RecordType {
  return JSON.parse(
    fs.readFileSync(__dirname + `/schemas/${name}.avsc`, 'UTF8'),
  )
}

export function getResult(name: string): string {
  return clean(
    fs.readFileSync(__dirname + `/typescriptModels/${name}.ts`, 'UTF8'),
  )
}

export function getAvroToTypeScript(schema: RecordType, options = {}): string {
  return clean(
    avroToTypeScript(schema, {
      convertEnumToType: false,
      removeNameSpace: true,
      ...options,
    }),
  )
}
