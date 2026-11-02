// Stable data contracts only; no runtime module implementation imports.

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
