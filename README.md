# Avro Typescript

A simple JS library to convert Avro Schemas to TypeScript interfaces.

## Install

```
npm install create-typescript-from-avro
```

The library can be run in node.js or the browser. It takes a Avro Schema as a JavaScript object (from JSON) and returns the TypeScript code as a string.

## Usage

```typescript
import * as fs from "fs";
import { avroToTypeScript, RecordType } from "create-typescript-from-avro";

const schemaText = fs.readFileSync(__dirname + "/example.avsc", "UTF8");
const schema: RecordType = JSON.parse(schemaText);
console.log(
  avroToTypeScript(schema, { convertEnumToType: false, removeNameSpace: true })
);
```

## Cli

To use this package from the CLI you need the `avro-to-ts` which is added either locally or globally depending on how you installed the package. Options are:
```
--file or -f                - File or directory path(s) of .avsc files
-- convertEnumToType or -c  - See above
-- removeNameSpace or -r    - See above
```

Example:

```
avro-to-ts -f somefolder -f someotherfolder/someschema.avsc -c -r > model.ts
```

This example takes all the `.avsc` files recursively from `somefolder` and `someschema.avsc`, generates the appropriate `.ts` content and pipes it into `model.ts`

## Features

Most Avro features are supported, including:

* Enumerated Types
* Maps
* Named Records
* Mandatory and optional fields
* Unions
* Primitives


## Running the tests

```
npm test
```

## Building the javascript files

```
npm build
```