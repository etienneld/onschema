# OnSchema

A lightweight, type-safe schema validation library for TypeScript featuring:
- Compact, JSON-compatible syntax using plain JavaScript objects
- Full TypeScript type inference support
- Zero dependencies
- Efficient validation and field stripping

## Overview

OnSchema lets you define schemas using familiar JavaScript syntax while maintaining full type safety:

```typescript
const userSchema = {
    name: 'string',
    email: ['optional', 'string'],
    address: {
        street: 'string',
        city: 'string',
    }
} as const;

type User = Infer<typeof userSchema>
// Infers to:
// {
//     name: string,
//     email?: string,
//     address: {
//         street: string,
//         city: string,
//     }
// }

// Validate data against schema
const isValid = isValid(data, userSchema);

// Strip extra fields to match schema
const cleaned = stripFields(data, userSchema);
```

## Installation

```bash
npm install onschema
```

## Schema Syntax

OnSchema schemas are composed of three main types: Primitives, Objects, and Complex types. All schemas are defined using plain JavaScript objects for maximum compatibility and readability.

### 1. Primitive Types

Basic data types that represent atomic values:

| Type     | Description                     | TypeScript Equivalent |
|----------|---------------------------------|--------------------|
| `'string'` | Any string value | `string` |
| `'boolean'` | True or false | `boolean` |
| `'number'` | Any numeric value | `number` |
| `'null'` | Null value | `null` |
| `'int'` | Integer within safe integer range | `number` |
| `'int8'` | 8-bit integer (-128 to 127) | `number` |
| `'int32'` | 32-bit integer (-2^31 to 2^31-1) | `number` |
| `'uint'` | Unsigned integer within safe range | `number` |
| `'uint8'` | 8-bit unsigned integer (0 to 255) | `number` |
| `'uint32'` | 32-bit unsigned integer (0 to 2^32-1) | `number` |

### 2. Object Types

Objects are defined as key-value mappings where values are other schema types:

```typescript
type SchemaObject = { [key: string]: Schema | SchemaOptional<any> }

// Example
const addressSchema = {
    street: 'string',
    city: 'string',
    zipCode: ['optional', 'string']
} as const;
```

### 3. Complex Types

Special schema types for more advanced validation patterns:

| Type | Syntax | Description |
|------|---------|------------|
| Optional | `['optional', Schema]` | Marks a field as optional in object types |
| Array | `['array', Schema]` | Array of elements matching the given schema |
| AnyOf | `['anyOf', ...Schema[]]` | Union type - matches any of the provided schemas |
| Literal | `['literal', value]` | Exact value match (string, number, boolean, or null) |

Example usage:

```typescript
const schema = {
    tags: ['array', 'string'],                    // string[]
    status: ['anyOf', 'string', 'null'],         // string | null
    type: ['literal', 'user'],                   // 'user'
    metadata: ['optional', { id: 'string' }]     // { id: string } | undefined
} as const;
```

## API Reference

### Validation

```typescript
function isValid<S extends Schema>(obj: any, schema: S): obj is Infer<S>
```
Validates that an object matches a schema. Returns a type predicate for TypeScript type narrowing.

### Field Stripping

```typescript
function stripFields<S extends Schema>(obj: Infer<S>, schema: S): Infer<S> | undefined
```
Removes fields not defined in the schema. Returns undefined if validation fails.

### Schema Construction Helpers

```typescript
// Object schema helper with proper type inference
function object<T extends Record<string, Schema>>(obj: T): T

// Remove fields from object schema
function omit<T extends SchemaObject, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>

// Complex type helpers
function optional<T extends Schema>(schema: T): SchemaOptional<T>
function array<T extends Schema>(schema: T): SchemaArray<T>
function anyOf<T extends Schema[]>(...types: T): SchemaAnyOf<T>
function literal<T extends string | number | boolean | null>(value: T): SchemaLiteral<T>
function nullable<T extends Schema>(schema: T): SchemaAnyOf<[T, 'null']>
```

### Type Inference

```typescript
type Infer<T extends Schema>
```
Converts OnSchema types to TypeScript types. Used automatically by validation functions and available for manual type extraction.

## License

MIT