import { readFileSync, lstatSync, existsSync, readdirSync } from 'fs'
import { resolve, extname, join, basename } from 'path'
import { generateAll } from './generators/generateAll'
import prettier from 'prettier'
import { RecordType, Options } from './model'
import { parser } from './parser'

interface Args extends Options {
  files: string[]
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

function collectAllFiles({ files }: Args): string[] {
  if (files === undefined) {
    throw new TypeError('Argument --file or -f should be provided!')
  }

  const rawFiles = files.map((f) => resolve(f))
  const allFiles = []
  rawFiles.forEach((rawFile) => collectFiles(rawFile, allFiles))
  return allFiles
}

function generateContent(schema: RecordType, args: Args): string {
  return generateAll(schema, args)
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

const parsedArgs: Args = parser.parseArgs()

const allRelevantFiles = collectAllFiles(parsedArgs)
convertAndSendToStdout(allRelevantFiles, parsedArgs)
