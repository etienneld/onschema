import { anyOf, array, enumOf, Infer, isValid, literal, object, optional, stripFields } from ".";
import { describe, test } from 'node:test';
import assert from 'node:assert';

//  Type-Level testing

type Equal<T, U> =
    (<V>() => V extends T ? 1 : 2) extends
    (<V>() => V extends U ? 1 : 2)
    ? true
    : false;

type Assert<T extends true> = T;

type TestNull = Assert<Equal<Infer<'null'>, null>>;
type TestString = Assert<Equal<Infer<'string'>, string>>;
type TestBoolean = Assert<Equal<Infer<'boolean'>, boolean>>;
type TestNumber = Assert<Equal<Infer<'number'>, number>>;
type TestInt8 = Assert<Equal<Infer<'int8'>, number>>;
type TestBigInt = Assert<Equal<Infer<'bigint'>, bigint>>;

{
    const a = { a: 'string', b: ['optional', 'number'] } as const;
    const b = object({ a: 'string', b: optional('number') })
    type TestHelpers = Assert<Equal<typeof a, typeof b>>
}

{
    const a = object({ a: 'string', b: optional('number') })
    type A = Infer<typeof a>
    type B = { a: string; b?: number }
    type TestObject = Assert<Equal<A, B>>;
}

type TestStringArray = Assert<Equal<Infer<['array', 'string']>, string[]>>;

{
    type T = Infer<['anyOf', 'string', 'number']>
    type TestAnyOf = Assert<Equal<T, string | number>>;
}

type TestLiteralStr = Assert<Equal<Infer<['literal', 'test']>, 'test'>>;
type TestLiteralNum = Assert<Equal<Infer<['literal', 42]>, 42>>;
type TestLiteralBigInt = Assert<Equal<Infer<['literal', 10n]>, 10n>>;

{
    const a = { foo: ['optional', { bar: 'boolean' }] } as const;
    type A = Infer<typeof a>
    type B = { foo?: { bar: boolean } }
    type TestNestedOptional = Assert<Equal<A, B>>;
}

{
    const e = enumOf('success', 200, true, null, 123n);
    type E = Infer<typeof e>;
    type Expected = 'success' | 200 | true | null | 123n;
    type TestEnum = Assert<Equal<E, Expected>>;
}


// Runtime-level testing

describe('Validation Library', () => {
    test('primitives validation', () => {
        assert.strictEqual(isValid(null, 'null'), true);
        assert.strictEqual(isValid(42, 'null'), false);

        assert.strictEqual(isValid('test', 'string'), true);
        assert.strictEqual(isValid(42, 'string'), false);

        assert.strictEqual(isValid(127, 'int8'), true);
        assert.strictEqual(isValid(128, 'int8'), false);

        // bigint validation
        assert.strictEqual(isValid(10n, 'bigint'), true);
        assert.strictEqual(isValid(10, 'bigint'), false);
    });

    test('object validation', () => {
        const schema = object({
            name: 'string',
            age: optional('number')
        });
        assert.strictEqual(isValid({ name: 'Bob', age: 30 }, schema), true);
        assert.strictEqual(isValid({ name: 'Alice' }, schema), true);
        assert.strictEqual(isValid({ name: 'Charlie', age: '30' }, schema), false);
    });

    test('array validation', () => {
        const schema = array('number');
        assert.strictEqual(isValid([1, 2, 3], schema), true);
        assert.strictEqual(isValid([1, '2'], schema), false);
    });

    test('anyOf validation', () => {
        const schema = anyOf('string', 'number');
        assert.strictEqual(isValid('test', schema), true);
        assert.strictEqual(isValid(42, schema), true);
        assert.strictEqual(isValid(true, schema), false);
    });

    test('stripFields functionality', () => {
        const schema = object({ a: 'string' });
        const obj = { a: 'test', b: 42 };
        const stripped = stripFields(obj, schema);

        assert.deepEqual(stripped, { a: 'test' });
        assert.strictEqual(stripped !== undefined && 'b' in stripped, false);
    });

    test('nested object validation', () => {
        const schema = object({
            user: object({
                id: 'uint32',
                preferences: object({
                    darkMode: 'boolean'
                })
            })
        });

        const validObj = {
            user: {
                id: 12345,
                preferences: { darkMode: true }
            }
        };

        const invalidObj = {
            user: {
                id: -5,
                preferences: { darkMode: 'yes' }
            }
        };

        assert.strictEqual(isValid(validObj, schema), true);
        assert.strictEqual(isValid(invalidObj, schema), false);
    });

    test('literal validation', () => {
        const schema = literal('success');
        assert.strictEqual(isValid('success', schema), true);
        assert.strictEqual(isValid('failure', schema), false);
    });

    describe('enum validation', () => {
        test('valid enum values', () => {
            const schema = enumOf('success', 200, true, null, 99n);
            assert.strictEqual(isValid('success', schema), true);
            assert.strictEqual(isValid(200, schema), true);
            assert.strictEqual(isValid(true, schema), true);
            assert.strictEqual(isValid(null, schema), true);
            assert.strictEqual(isValid(99n, schema), true);
        });

        test('invalid enum value', () => {
            const schema = enumOf('success', 200);
            assert.strictEqual(isValid('failure', schema), false);
            assert.strictEqual(isValid(201, schema), false);
        });

        test('case sensitivity for strings', () => {
            const schema = enumOf('Success');
            assert.strictEqual(isValid('success', schema), false);
            assert.strictEqual(isValid('Success', schema), true);
        });

        test('null handling in enum', () => {
            const schema = enumOf('null', null);
            assert.strictEqual(isValid(null, schema), true);
            assert.strictEqual(isValid('null', schema), true);
            assert.strictEqual(isValid(undefined, schema), false);
        });
    });
});
