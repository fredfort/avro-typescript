#!/usr/bin/env node

import { readFileSync, lstatSync, existsSync, readdirSync } from "fs";
import { resolve, extname, join, basename } from "path";
import { avroToTypeScript, RecordType } from "./index";
import minimist from "minimist";

interface Args {
  file: string | string[];
  convertEnumToType: boolean;
  removeNameSpace: boolean;
}

function collectFiles(filePath: string, accumulated: string[]): string[] {
  if (!existsSync(filePath)) {
    throw new TypeError(`Path "${filePath}" doesn't exist!`);
  }
  const stats = lstatSync(filePath);
  if (stats.isDirectory()) {
    const content = readdirSync(filePath);
    content.map(childPath =>
      collectFiles(join(filePath, childPath), accumulated)
    );
  } else if (extname(filePath) === ".avsc") {
    accumulated.push(filePath);
  }
  return accumulated;
}

function collectAllFiles({ file }: Args): string[] {
  if (file === undefined) {
    throw new TypeError("Argument --file or -f should be provided!");
  }

  const inputFiles: string[] = Array.isArray(file) ? file : [file];
  const rawFiles = inputFiles.map(f => resolve(f));
  const allFiles = [];
  rawFiles.forEach(rawFile => collectFiles(rawFile, allFiles));
  return allFiles;
}

function convertAndSendToStdout(files: string[], args: Args) {
  files.map(f => {
    const content = readFileSync(f, "UTF8");
    const schema: RecordType = JSON.parse(content);
    const tsContent = avroToTypeScript(schema, {
      convertEnumToType: Boolean(args.convertEnumToType),
      removeNameSpace: Boolean(args.removeNameSpace)
    });
    process.stdout.write(`// Generated from ${basename(f)}\n\n${tsContent}\n`);
  });
}

const [, , ...args] = process.argv;

const parsedArgs = minimist<Args>(args, {
  alias: { f: "file", c: "convertEnumToType", r: "removeNameSpace" },
  string: ["files"],
  boolean: ["convertEnumToType", "removeNameSpace"]
});

const files = collectAllFiles(parsedArgs);
convertAndSendToStdout(files, parsedArgs);
