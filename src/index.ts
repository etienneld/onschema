export type PrimitiveNumeric = 'uint' | 'uint8' | 'uint32' | 'int' | 'int8' | 'int32' | 'number';
export type Primitive = 'null' | 'string' | 'boolean' | PrimitiveNumeric | 'bigint';

export type SchemaObject = { [k: string]: Schema | SchemaOptional<any> };

// Helper types for different schema variants
export type SchemaArray<T extends Schema> = readonly ['array', T];
export type SchemaOptional<T extends Schema> = readonly ['optional', T];
export type SchemaAnyOf<T extends Schema[]> = readonly ['anyOf', ...T];
export type SchemaLiteral<T extends string | number | boolean | null | bigint> = readonly ['literal', T];
export type SchemaEnum<T extends readonly (string | number | boolean | null | bigint)[]> = readonly ['enum', ...T];

/** Main Schema type that can represent any valid schema structure */
export type Schema =
    | Primitive
    | SchemaObject
    | SchemaAnyOf<any>
    | SchemaArray<any>
    | SchemaLiteral<any>
    | SchemaEnum<any>;

type OptionalKeys<T> = { [K in keyof T]: T[K] extends SchemaOptional<any> ? K : never }[keyof T];
type RequiredKeys<T> = { [K in keyof T]: T[K] extends SchemaOptional<any> ? never : K }[keyof T];
type Flatten<T> = T extends infer U ? { [K in keyof U]: Exclude<U[K], undefined> } : never;

type StripOptional<T extends Schema | SchemaOptional<any>> =
    T extends SchemaOptional<infer U> ? U : T

/** Type inference util - converts schema types to TypeScript types */
export type Infer<T extends Schema> =
    T extends 'null' ? null :
    T extends 'string' ? string :
    T extends 'boolean' ? boolean :
    T extends 'bigint' ? bigint :
    T extends SchemaLiteral<infer L> ? L :
    T extends SchemaEnum<infer U> ? U[number] :
    T extends PrimitiveNumeric ? number :
    T extends SchemaArray<infer U> ? (U extends Schema ? Infer<U>[] : never) :
    T extends SchemaAnyOf<infer U> ? Infer<U[number]> :
    T extends SchemaObject ? Flatten<{
        [K in RequiredKeys<T>]: Infer<StripOptional<T[K]>>;
    } & {
        [K in OptionalKeys<T>]?: Infer<StripOptional<T[K]>>;
    }> :
    never;

export function object<T extends Record<string, Schema | SchemaOptional<any>>>(obj: T): { readonly [K in keyof T]: T[K] } {
    return obj;
}

export function omit<T extends SchemaObject, Keys extends keyof T>(obj: T, keys: Keys[]): Omit<T, Keys> {
    const newObj = { ...obj } as T;
    for (const key of keys) {
        delete newObj[key];
    }
    return newObj;
}

export function optional<T extends Schema>(t: T): readonly ['optional', T] {
    return ['optional', t];
}

export function literal<T extends string | number | boolean | null | bigint>(value: T): readonly ['literal', T] {
    return ['literal', value];
}

export function array<T extends Schema>(t: T): readonly ['array', T] {
    return ['array', t];
}

export function anyOf<T extends Schema[]>(...types: T): readonly ['anyOf', ...T] {
    return ['anyOf', ...types] as ['anyOf', ...T];
}

export function enumOf<T extends readonly (string | number | boolean | null | bigint)[]>(...values: T): readonly ['enum', ...T] {
    return ['enum', ...values] as const;
}

export function nullable<T extends Schema>(t: T) {
    return anyOf(t, 'null');
}

function isInt(obj: unknown, bits?: 8 | 32): obj is number {
    const min = bits == null ? -Number.MAX_SAFE_INTEGER : -(2 ** (bits - 1));
    const max = bits == null ? Number.MAX_SAFE_INTEGER : (2 ** (bits - 1)) - 1;
    return typeof obj === 'number' && obj >= min && obj <= max && obj % 1 === 0;
}

function isUint(obj: unknown, bits?: 8 | 32): obj is number {
    const max = bits == null ? Number.MAX_SAFE_INTEGER : (2 ** bits) - 1;
    return typeof obj === 'number' && obj >= 0 && obj <= max && obj % 1 === 0;
}

function schemaIsOptional(schema: unknown): schema is SchemaOptional<any> {
    return (Array.isArray(schema)) && schema[0] == 'optional'
}

function schemaRemoveOptional<T>(schema: unknown): Schema {
    return schemaIsOptional(schema) ? schema[1] : schema;
}

export function isValid<S extends Schema>(obj: any, schema: S): obj is Infer<S> {
    if (typeof schema === 'string') {
        const type = schema as Primitive;
        switch (type) {
            case 'null': return obj === null;
            case 'number': return typeof obj === 'number';
            case 'boolean': return typeof obj === 'boolean';
            case 'bigint': return typeof obj === 'bigint';
            case 'int': return isInt(obj);
            case 'int8': return isInt(obj, 8);
            case 'int32': return isInt(obj, 32);
            case 'uint': return isUint(obj);
            case 'uint8': return isUint(obj, 8);
            case 'uint32': return isUint(obj, 32);
            case 'string': return typeof obj === 'string';
            default:
                const _: never = type;
                return false;
        }
    }
    if (Array.isArray(schema)) {
        const [type, ...params] = schema;
        switch (type) {
            case 'anyOf':
                return params.some(s => isValid(obj, s));
            case 'array':
                // @ts-ignore
                return Array.isArray(obj) && obj.every(item => isValid(item, params[0]));
            case 'literal':
                return obj === params[0];
            case 'enum':
                return params.includes(obj);
            default:
                // @ts-ignore: type is broken here
                const _: never = type;
                return false;
        }
    }
    if (typeof schema === 'object') {
        if (typeof obj === 'object' && obj !== null) {
            for (let [key, childSchema] of Object.entries(schema as any)) {
                if (obj[key] === undefined && schemaIsOptional(childSchema as Schema))
                    continue
                if (!isValid(obj[key], schemaRemoveOptional(childSchema)))
                    return false
            }
            return true
        }
    }
    return false;
}

export function stripFields<S extends Schema>(obj: Infer<S>, schema: S): Infer<S> | undefined {
    function recursiveStrip<S extends Schema | SchemaOptional<any>>(obj: any, schema: S): any {
        if (typeof obj === 'string' || typeof obj === 'bigint') return obj;
        if (Array.isArray(schema)) {
            const [kind, subSchema] = schema;
            if (kind === 'anyOf')
                return recursiveStrip(obj, subSchema) as any
            if (kind === 'array' && Array.isArray(obj))
                return obj.map(item => recursiveStrip(item, subSchema)) as any;
            throw new Error('obj not valid')
        }
        if (typeof schema === 'object') {
            const newObj: any = {};
            for (const [key, childSchema] of Object.entries(schema)) {
                if (obj[key] === undefined) continue;
                const childSchemaWithoutOptional = schemaIsOptional(childSchema) ? childSchema[1] : childSchema;
                newObj[key] = recursiveStrip(obj[key], childSchemaWithoutOptional);
            }
            return newObj;
        }
        return obj;
    }
    // @ts-ignore
    if (!isValid(obj, schema)) return;
    return recursiveStrip(obj, schema)
}
