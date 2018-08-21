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
import { avroToTypeScript, RecordType } from "../lib/";

const schemaText = fs.readFileSync(__dirname + "/example.avsc", "UTF8");
const schema: RecordType = JSON.parse(schemaText);
console.log(
  avroToTypeScript(schema, { convertEnumToType: false, removeNameSpace: true })
);
```

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