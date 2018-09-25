import { readFileSync, lstatSync, existsSync, readdirSync } from 'fs'
import { resolve, extname, join, basename } from 'path'
import { avroToTypeScript, RecordType } from './index'
import { generateAll } from './generators/generateAll'
import prettier from 'prettier'
const minimist = require('minimist')

interface Args {
  file: string | string[]
  convertEnumToType: boolean
  removeNameSpace: boolean
  customMode: boolean
}

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

function collectAllFiles({ file }: Args): string[] {
  if (file === undefined) {
    throw new TypeError('Argument --file or -f should be provided!')
  }

  const inputFiles: string[] = Array.isArray(file) ? file : [file]
  const rawFiles = inputFiles.map((f) => resolve(f))
  const allFiles = []
  rawFiles.forEach((rawFile) => collectFiles(rawFile, allFiles))
  return allFiles
}

function generateContent(schema: RecordType, args: Args): string {
  const options = {
    convertEnumToType: Boolean(args.convertEnumToType),
    removeNameSpace: Boolean(args.removeNameSpace),
  }
  if (Boolean(args.customMode)) {
    return generateAll(schema, options)
  } else {
    return avroToTypeScript(schema, options)
  }
}

function convertAndSendToStdout(files: string[], args: Args) {
  const source = files
    .map((f) => {
      const content = readFileSync(f, 'UTF8')
      const schema: RecordType = JSON.parse(content)
      const tsContent = generateContent(schema, args)
      return `// Generated from ${basename(f)}\n\n${tsContent}\n`
    })
    .join('\n')
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

const [, , ...valuableArgs] = process.argv

const parsedArgs: Args = minimist(valuableArgs, {
  alias: { f: 'file', c: 'convertEnumToType', r: 'removeNameSpace', x: 'customMode' },
  string: ['files'],
  boolean: ['convertEnumToType', 'removeNameSpace'],
})

const allRelevantFiles = collectAllFiles(parsedArgs)
convertAndSendToStdout(allRelevantFiles, parsedArgs)
