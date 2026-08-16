import { randomUUID as nodeRandomUUID } from 'node:crypto';

/**
 * Jest manual mock for `expo-crypto`. The real module delegates to a native
 * module that jest-expo stubs out to no-ops, so `randomUUID()` would
 * otherwise resolve to `undefined`. Only `randomUUID` is mocked since it's
 * the only export our code uses.
 */
export function randomUUID(): string {
  return nodeRandomUUID();
}
