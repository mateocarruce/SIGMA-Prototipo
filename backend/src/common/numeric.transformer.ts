import { ValueTransformer } from 'typeorm';

/**
 * Postgres numeric columns come back from `pg` as strings (to avoid float
 * precision surprises at the driver level). We convert to JS number on read
 * so the JSON API returns real numbers, matching the contract's examples
 * (e.g. valor_oficial: 8.71, not "8.71").
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};
