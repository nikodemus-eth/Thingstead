// server/schema-validator.mjs

// Project Schema Validation

export function validateSchema(data) {
    const schema = {
        type: "object",
        properties: {
            name: { type: "string" },
            age: { type: "number" },
            email: { type: "string", format: "email" },
        },
        required: ["name", "age", "email"],
    };

    const validate = require('ajv')().compile(schema);
    const valid = validate(data);

    if (!valid) {
        return validate.errors;
    }
    return null;
}
