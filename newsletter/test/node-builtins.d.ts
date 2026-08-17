// The repo's @types/node predates node:sqlite and getBuiltinModule —
// minimal ambient shapes for the test infrastructure (runtime is Node 26).
declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      all(...parameters: unknown[]): unknown[];
      get(...parameters: unknown[]): unknown;
      run(...parameters: unknown[]): unknown;
    };
  }
}

declare namespace NodeJS {
  interface Process {
    getBuiltinModule(name: string): unknown;
  }
}
