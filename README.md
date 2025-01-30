# OnSchema

OnSchema is a lightweight, type-safe schema validation library that blends the simplicity of JSON Schema with the powerful type inference of TypeScript.
Designed for developers who need both runtime validation and compile-time type safety,
OnSchema offers a compact schema definition syntax that can be easily serialized to JSON, while automatically inferring TypeScript types from your schemas.

## Features

- **JSON-Serializable Schemas**: Define schemas with plain objects/arrays that can be stored as JSON
- **TypeScript First**: Automatic type inference for validated data
- **Compact Syntax**: More minimal than JSON Schema, more serializable than Zod
- **Runtime Safety**: Comprehensive validation with detailed type checking
- **Stripping Extra Fields**: Remove unexpected properties from objects
- **Numeric Precision**: Support for int8, uint32, and other numeric types
- **Composable Schemas**: Create complex types with arrays, optionals, unions, and literals

## Installation

```bash
npm install onschema
```

## Getting Started

```typescript
import { object, optional, array, anyOf, literal, isValid } from 'onschema';

// Define a schema
const userSchema = {
  id: 'uint32',
  name: 'string',
  email: ['optional', 'string'],
  tags: ['array', 'string'],
  status: [
    'anyOf',
    ['literal', 'active'],
    ['literal', 'pending'],
    ['literal', 'disabled']
  ]
} as const;

// or use helpers: 

const userSchema = object({
  id: 'uint32',
  name: 'string',
  email: optional('string'),
  tags: array('string'),
  status: anyOf(literal('active'), literal('pending'), literal('disabled'))
});

// Infer TypeScript type
type User = Infer<typeof userSchema>;
/*
Equivalent to:
type User = {
  id: number;
  name: string;
  email?: string | undefined;
  tags: string[];
  status: "active" | "pending" | "disabled";
}
*/

// Validate data
const userData = {
  id: 42,
  name: 'Alice',
  tags: ['admin', 'user'],
  status: 'active'
};

if (isValid(userData, userSchema)) {
  // userData is now typed as User
  console.log('Valid user:', userData);
}
```

## Core Concepts

### Schema Definition

Schemas are built from primitive types and composable schema constructors:

```typescript
import { object, optional, array, literal } from 'onschema';

const productSchema = object({
  id: 'uint32',
  name: 'string',
  price: 'number',
  dimensions: object({
    width: 'number',
    height: 'number',
    depth: 'number'
  }),
  tags: array('string'),
  status: optional(anyOf(literal('instock'), literal('backorder'))),
  createdAt: 'uint32'
});
```

### Type Inference

Get automatic TypeScript types from your schemas:

```typescript
type Product = Infer<typeof productSchema>;
/*
{
  id: number;
  name: string;
  price: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  tags: string[];
  status?: "instock" | "backorder" | undefined;
  createdAt: number;
}
*/
```

### Validation

Validate data structures against your schemas:

```typescript
const validateProduct = (data: unknown) => {
  if (isValid(data, productSchema)) {
    // data is now properly typed
    return processProduct(data);
  }
  throw new Error('Invalid product data');
};
```

### Numeric Types

Precision control for numbers:

```typescript
const sensorSchema = object({
  temperature: 'int8',   // -128 to 127
  pressure: 'uint32',    // 0 to 4,294,967,295
  accuracy: 'number'     // Standard double-precision
});
```

### Stripping Extra Fields

Remove unexpected properties while validating:

```typescript
const rawData = {
  id: 42,
  name: 'Widget',
  price: 9.99,
  unknownField: 'should be removed'
};

const cleanData = stripFields(rawData, productSchema);
// cleanData no longer contains unknownField
```

## API Reference

### Primitive Types

```typescript
type Primitive = 
  | 'null'
  | 'string'
  | 'boolean'
  | 'number'
  | 'int' | 'int8' | 'int32'
  | 'uint' | 'uint8' | 'uint32';
```

### Schema Constructors

#### `object(schema: T)`
Define object schemas with nested validation:
```typescript
const addressSchema = object({
  street: 'string',
  city: 'string',
  zip: 'uint32'
});
```

#### `array(type: Schema)`
Array validation:
```typescript
const numberArraySchema = array('number');
```

#### `optional(type: Schema)`
Optional properties:
```typescript
const userSchema = object({
  name: 'string',
  age: optional('uint32')
});
```

#### `anyOf(...types: Schema[])`
Type unions:
```typescript
const idSchema = anyOf('string', 'uint32');
```

#### `literal(value: Literal)`
Exact value matching:
```typescript
const trueLiteral = literal(true);
const answerLiteral = literal(42);
```

#### `nullable(type: Schema)`
Shorthand for optional null:
```typescript
const nullableString = nullable('string');
// Equivalent to anyOf('string', 'null')
```

### Validation Functions

#### `isValid(data: unknown, schema: Schema): boolean`
Type-safe validation:
```typescript
if (isValid(input, userSchema)) {
  // input is now typed as User
}
```

#### `stripFields(data: unknown, schema: Schema): Infer<Schema>`
Remove extra fields while validating:
```typescript
const clean = stripFields(rawData, schema);
```

### Type Inference

#### `Infer<Schema>`
Get the TypeScript type from any schema:
```typescript
type UserArray = Infer<typeof userArraySchema>;
// Equivalent to User[]
```

## Advanced Usage

### Recursive Schemas

Define self-referential types using `() => Schema`:

```typescript
interface Category {
  name: string;
  subcategories: Category[];
}

const categorySchema: SchemaObject = object({
  name: 'string',
  subcategories: array(() => categorySchema)
});
```

### Schema Composition

Combine schemas using utility functions:

```typescript
const baseSchema = object({
  id: 'uint32',
  createdAt: 'uint32'
});

const userSchema = {
  ...baseSchema,
  name: 'string',
  email: 'string'
};
```

### Strict Numeric Validation

Precision-enforced number types:

| Type     | Range                          |
|----------|--------------------------------|
| int8     | -128 to 127                    |
| uint8    | 0 to 255                       |
| int32    | -2,147,483,648 to 2,147,483,647|
| uint32   | 0 to 4,294,967,295             |
| number   | Standard IEEE double precision |

## Comparison with Other Libraries

| Feature              | OnSchema | Zod     | JSON Schema |
|----------------------|----------|---------|-------------|
| TS Inference         | ✅       | ✅      | ❌          |
| JSON-Serializable    | ✅       | ❌      | ✅          |
| Runtime Safety       | ✅       | ✅      | ✅          |
| Numeric Constraints  | ✅       | ❌      | ✅          |