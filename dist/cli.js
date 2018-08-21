#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
var index_1 = require("./index");
var minimist_1 = __importDefault(require("minimist"));
function collectFiles(filePath, accumulated) {
    if (!fs_1.existsSync(filePath)) {
        throw new TypeError("Path \"" + filePath + "\" doesn't exist!");
    }
    var stats = fs_1.lstatSync(filePath);
    if (stats.isDirectory()) {
        var content = fs_1.readdirSync(filePath);
        content.map(function (childPath) {
            return collectFiles(path_1.join(filePath, childPath), accumulated);
        });
    }
    else if (path_1.extname(filePath) === ".avsc") {
        accumulated.push(filePath);
    }
    return accumulated;
}
function collectAllFiles(_a) {
    var file = _a.file;
    if (file === undefined) {
        throw new TypeError("Argument --file or -f should be provided!");
    }
    var inputFiles = Array.isArray(file) ? file : [file];
    var rawFiles = inputFiles.map(function (f) { return path_1.resolve(f); });
    var allFiles = [];
    rawFiles.forEach(function (rawFile) { return collectFiles(rawFile, allFiles); });
    return allFiles;
}
function convertAndSendToStdout(files, args) {
    files.map(function (f) {
        var content = fs_1.readFileSync(f, "UTF8");
        var schema = JSON.parse(content);
        var tsContent = index_1.avroToTypeScript(schema, {
            convertEnumToType: Boolean(args.convertEnumToType),
            removeNameSpace: Boolean(args.removeNameSpace)
        });
        process.stdout.write("// Generated from " + path_1.basename(f) + "\n\n" + tsContent + "\n");
    });
}
var _a = process.argv, args = _a.slice(2);
var parsedArgs = minimist_1.default(args, {
    alias: { f: "file", c: "convertEnumToType", r: "removeNameSpace" },
    string: ["files"],
    boolean: ["convertEnumToType", "removeNameSpace"]
});
var files = collectAllFiles(parsedArgs);
convertAndSendToStdout(files, parsedArgs);
