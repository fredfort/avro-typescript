import { readFileSync, lstatSync, existsSync, readdirSync } from 'fs'
import { resolve, extname, join } from 'path'
import prettier from 'prettier'
import { RecordType } from './model'

function collectFiles(filePath: string, accumulated: string[]): string[] {
  if (!existsSync(filePath)) {
    throw new TypeError(`Path "${filePath}" doesn't exist!`)
  }
  const stats = lstatSync(filePath)
  if (stats.isDirectory()) {
    const content = readdirSync(filePath)
    content.map((childPath) => collectFiles(join(filePath, childPath), accumulated))
  } else if (extname(filePath) === '.avsc') {
    accumulated.push(filePath)
  }
  return accumulated
}

export function getAllFiles(files: string[]): string[] {
  const rawFiles = files.map((f) => resolve(f))
  const allFiles = []
  rawFiles.forEach((rawFile) => collectFiles(rawFile, allFiles))
  return allFiles
}

export function readSchema(file: string): RecordType {
  const content = readFileSync(file, 'UTF8')
  const schema: RecordType = JSON.parse(content)
  return schema
}

export function writeTypescriptOutput(source: string): void {
  const formattedSource = prettier.format(source, {
    printWidth: 120,
    semi: true,
    parser: 'typescript',
    tabWidth: 2,
    useTabs: false,
    singleQuote: true,
    trailingComma: 'es5',
    bracketSpacing: true,
    arrowParens: 'always',
  })
  process.stdout.write(formattedSource)
}
