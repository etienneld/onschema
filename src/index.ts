// Typescript-first validation library, 

export type PrimitiveNumeric = 'uint' | 'uint8' | 'uint32' | 'int' | 'int8' | 'int32' | 'number'
export type Primitive = 'null' | 'string' | 'boolean' | PrimitiveNumeric;

export type SchemaProperty = Schema | SchemaOptional<any>;
export type SchemaObject = { [k: string]: SchemaProperty };

export type SchemaArray<T extends Schema> = ['array', T]
export type SchemaOptional<T extends Schema> = ['optional', T]
export type SchemaAnyOf<T extends Schema[]> = ['anyOf', ...T]
export type SchemaRegex<Pattern extends string> = ['regex', Pattern]

export type Schema = Primitive | SchemaObject | SchemaAnyOf<any> | SchemaArray<any> | SchemaRegex<any>;

type OptionalKeys<T> = { [K in keyof T]: T[K] extends SchemaOptional<any> ? K : never }[keyof T];
type RequiredKeys<T> = { [K in keyof T]: T[K] extends SchemaOptional<any> ? never : K }[keyof T];

export type Infer<T extends Schema | SchemaOptional<any>> =
    T extends 'null' ? null :
    T extends 'string' ? string :
    T extends SchemaRegex<any> ? string :
    T extends 'boolean' ? boolean :
    T extends PrimitiveNumeric ? number :
    T extends SchemaAnyOf<infer U> ? (U extends Schema ? Infer<U> : never) :
    T extends SchemaArray<infer U> ? (U extends Schema ? Infer<U>[] : never) :
    T extends SchemaObject ? {
        [K in RequiredKeys<T>]: T[K] extends Schema ? Infer<T[K]> : never;
    } & {
        [K in OptionalKeys<T>]?: T[K] extends SchemaOptional<infer U> ? Infer<U> : never;
    } :
    never;

export function object<T extends SchemaObject>(obj: T): T {
    return obj;
}

export function omit<T extends SchemaObject, Keys extends keyof T>(obj: T, keys: Keys[]): Omit<T, Keys> {
    const newObj = { ...obj } as T;
    for (const key of keys) {
        delete newObj[key];
    }
    return newObj
}

export function optional<T extends Schema>(t: T): ['optional', T] {
    return ['optional', t]
}

export function array<T extends Schema>(t: T): ['array', T] {
    return ['array', t]
}

export function anyOf<T extends Schema[]>(...types: T): ['anyOf', ...T] {
    return ['anyOf', ...types];
}

export function nullable<T extends Schema>(t: T) {
    return anyOf(t, 'null');
}

export function regex(pattern: TemplateStringsArray): ['regex', string] {
    return ['regex', String.raw(pattern)]
}

function isInt(obj: unknown, bits?: 8 | 32): obj is number {
    const min = bits == null ? Number.MAX_SAFE_INTEGER : -(2 ** (bits - 1))
    const max = bits == null ? Number.MIN_SAFE_INTEGER : 2 ** (bits - 1) - 1
    return typeof obj === 'number' && obj >= min && obj <= max && obj % 1 === 0
}

function isUint(obj: unknown, bits?: 8 | 32): obj is number {
    const max = bits == null ? Number.MAX_SAFE_INTEGER : 2 ** bits - 1
    return typeof obj === 'number' && obj >= 0 && obj <= max && obj % 1 === 0
}

export function isValid<S extends Schema | SchemaOptional<any>>(obj: any, schema: S): obj is Infer<S> {
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
                const _: never = type
                return false;
        }
    }
    if (typeof schema === 'object') {
        if (Array.isArray(schema)) {
            const [type, param] = schema
            switch (type) {
                case 'anyOf': return Array.isArray(param) && param.some(s => isValid(obj, s));
                case 'array': return Array.isArray(obj) && obj.every(item => isValid(item, param));
                case 'optional': return obj === undefined || isValid(obj, param)
                case 'regex': return (new RegExp(param)).test(obj)
                default:
                    const _: never = type
                    return false;
            }
        }
        if (typeof obj === 'object') {
            return Object.entries(schema).every(([key, childSchema]) =>
                isValid(obj[key], childSchema)
            );
        }
    }
    return false;
}

export function stripFields<S extends Schema | SchemaOptional<any>>(obj: Infer<S>, schema: S): Infer<S> | undefined {
    function recursive<S extends Schema | SchemaOptional<any>>(obj: any, schema: S): any {
        if (typeof obj === 'string') return obj;
        if (Array.isArray(schema)) {
            const [kind, subSchema] = schema;
            if (kind === 'optional' || kind === 'anyOf')
                return recursive(obj, subSchema) as any
            if (kind === 'array' && Array.isArray(obj))
                return obj.map(item => recursive(item, subSchema)) as any;
            throw new Error('obj not valid')
        }

        if (typeof schema === 'object') {
            return Object.entries(schema).reduce(([key, subSchema]: any, newObj: any) => {
                newObj[key] = recursive(obj[key], subSchema);
                return newObj
            }, {})
        }
        return obj;
    }
    if (!isValid(obj, schema)) return
    return recursive(obj, schema)
}

const mySchema = object({
    name: 'string',
    details: {
        price: 'number'
    }
})

const myObject: unknown = {
    name: 'Product Name',
    details: {
        price: 29.99,
    },
};

// Validate `myObject` based on `mySchema`
if (isValid(myObject, mySchema)) {
    const price: number = myObject.details.price
    // ✅ After validation, TypeScript infers `myObject` matches the schema
}

// Incorrect usage outside of validation block
// const price: number = myObject.details.price;
// ❌ Error: Property 'details' does not exist on type 'unknown'