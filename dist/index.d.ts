import { Options, RecordType } from './model';
export { RecordType, Options } from './model';
/** Converts an Avro record type to a TypeScript file */
export declare function avroToTypeScript(recordType: RecordType, userOptions: Options): string;
