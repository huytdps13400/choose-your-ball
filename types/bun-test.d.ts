/**
 * A minimal ambient declaration for Bun's built-in test runner.
 *
 * The tests run under `bun test`, which needs no installed runner and no
 * transform step — but `tsc --noEmit` still typechecks them along with the rest
 * of the app, and it has never heard of `bun:test`. Rather than adding
 * `@types/bun` (which pulls Bun's whole ambient surface, including globals that
 * clash with React Native's) this declares only what the tests actually use.
 *
 * If `@types/bun` is ever added for other reasons, delete this file — do not
 * keep both, or the two `Bun` globals will fight.
 */
declare module "bun:test" {
  type Matchers = {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeGreaterThan(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toContain(expected: unknown): void;
    toHaveLength(expected: number): void;
    toHaveBeenCalled(): void;
    toHaveBeenCalledTimes(expected: number): void;
    toMatch(expected: RegExp | string): void;
    toThrow(expected?: RegExp | string): void;
    readonly not: Matchers;
  };

  export function describe(name: string, body: () => void): void;
  export function test(name: string, body: () => void | Promise<void>): void;
  export function beforeAll(body: () => void | Promise<void>): void;
  export function afterAll(body: () => void | Promise<void>): void;
  export function expect(actual: unknown, message?: string): Matchers;

  type MockFn<Args extends unknown[], Result> = ((...args: Args) => Result) & {
    mock: { calls: Args[] };
  };

  export function mock<Args extends unknown[], Result>(
    implementation: (...args: Args) => Result
  ): MockFn<Args, Result>;

  export namespace mock {
    function module(specifier: string, factory: () => unknown): void;
  }
}

/** Only the file reader and the zlib inflate the source-shape tests use. */
declare const Bun: {
  file(path: string | URL): { arrayBuffer(): Promise<ArrayBuffer>; text(): Promise<string> };
  inflateSync(data: Uint8Array): Uint8Array;
};
