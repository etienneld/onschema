export type PrimitiveNumeric = 'uint' | 'uint8' | 'uint32' | 'int' | 'int8' | 'int32' | 'number';
export type Primitive = 'null' | 'string' | 'boolean' | PrimitiveNumeric;

export type SchemaObject = { [k: string]: Schema };

// Helper types for different schema variants
export type SchemaArray<T extends Schema> = ['array', T];
export type SchemaOptional<T extends Schema> = ['optional', T];
export type SchemaAnyOf<T extends Schema[]> = ['anyOf', ...T];
export type SchemaLiteral<T extends string | number | boolean | null> = ['literal', T];

/** Main Schema type that can represent any valid schema structure */
export type Schema =
    | Primitive
    | SchemaObject
    | SchemaAnyOf<any>
    | SchemaArray<any>
    | SchemaLiteral<any>
    | SchemaOptional<any>;

type OptionalKeys<T> = { [K in keyof T]: T[K] extends SchemaOptional<any> ? K : never }[keyof T];
type RequiredKeys<T> = { [K in keyof T]: T[K] extends SchemaOptional<any> ? never : K }[keyof T];
type Flatten<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

/** Type inference util - converts schema types to TypeScript types */
export type Infer<T extends Schema> =
    T extends 'null' ? null :
    T extends 'string' ? string :
    T extends 'boolean' ? boolean :
    T extends SchemaLiteral<infer L> ? L :
    T extends PrimitiveNumeric ? number :
    T extends SchemaArray<infer U> ? (U extends Schema ? Infer<U>[] : never) :
    T extends SchemaAnyOf<infer U> ? Infer<U[number]> :
    T extends SchemaOptional<infer U> ? Infer<U> | undefined :
    T extends SchemaObject ? Flatten<{
        [K in RequiredKeys<T>]: Infer<T[K]>;
    } & {
        [K in OptionalKeys<T>]?: Infer<T[K]>;
    }> :
    never;

export function object<T extends Record<string, Schema>>(obj: T): { [K in keyof T]: T[K] } {
    return obj;
}

export function omit<T extends SchemaObject, Keys extends keyof T>(obj: T, keys: Keys[]): Omit<T, Keys> {
    const newObj = { ...obj } as T;
    for (const key of keys) {
        delete newObj[key];
    }
    return newObj;
}

export function optional<T extends Schema>(t: T): ['optional', T] {
    return ['optional', t];
}

export function literal<T extends string | number | boolean | null>(value: T): ['literal', T] {
    return ['literal', value];
}

export function array<T extends Schema>(t: T): ['array', T] {
    return ['array', t];
}

export function anyOf<T extends Schema[]>(...types: T): ['anyOf', ...T] {
    return ['anyOf', ...types] as ['anyOf', ...T];
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

export function isValid<S extends Schema>(obj: any, schema: S): obj is Infer<S> {
    if (typeof schema === 'string') {
        const type = schema as Primitive;
        switch (type) {
            case 'null': return obj === null;
            case 'number': return typeof obj === 'number';
            case 'boolean': return typeof obj === 'boolean';
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
        const [type, param] = schema;
        switch (type) {
            case 'anyOf': {
                const subSchemas = schema.slice(1)
                return Array.isArray(subSchemas) && subSchemas.some(s => isValid(obj, s));
            }
            case 'array':
                return Array.isArray(obj) && obj.every(item => isValid(item, param) as any);
            case 'optional':
                return obj === undefined || isValid(obj, param);
            case 'literal':
                return obj === param;
            default:
                const _: never = type;
                return false;
        }
    }
    if (typeof schema === 'object') {
        if (typeof obj === 'object' && obj !== null) {
            return Object.entries(schema as any).every(([key, childSchema]) =>
                isValid(obj[key], childSchema as any)
            );
        }
    }
    return false;
}

export function stripFields<S extends Schema | SchemaOptional<any>>(obj: Infer<S>, schema: S): Infer<S> {
    function recursiveStrip<S extends Schema | SchemaOptional<any>>(obj: any, schema: S): any {
        if (typeof obj === 'string') return obj;
        if (Array.isArray(schema)) {
            const [kind, subSchema] = schema;
            if (kind === 'optional' || kind === 'anyOf')
                return recursiveStrip(obj, subSchema) as any
            if (kind === 'array' && Array.isArray(obj))
                return obj.map(item => recursiveStrip(item, subSchema)) as any;
            throw new Error('obj not valid')
        }
        if (typeof schema === 'object') {
            return Object.entries(schema).reduce((newObj: any, [key, subSchema]: any) => {
                newObj[key] = recursiveStrip(obj[key], subSchema);
                return newObj
            }, {})
        }
        return obj;
    }
    // @ts-ignore
    if (!isValid(obj, schema)) throw new Error('invalid object')
    return recursiveStrip(obj, schema)
}
