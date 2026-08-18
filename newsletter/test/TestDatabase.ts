// Test infrastructure: a D1-shaped adapter over node:sqlite running the
// REAL migration files, so every audience/ledger test executes the same
// SQL production runs — not a hand-mocked approximation of it.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

// vitest's bundled vite predates the node:sqlite builtin and cannot
// resolve a static import of it — fetch the module at runtime instead
const { DatabaseSync } = process.getBuiltinModule(
  'node:sqlite',
) as typeof import('node:sqlite');
type DatabaseSync = DatabaseSyncType;

const migrationsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../migrations',
);

class $TestStatement {
  constructor(
    public database: DatabaseSync,
    public sql: string,
    public parameters: unknown[] = [],
  ) {}

  bind(...parameters: unknown[]): $TestStatement {
    return new $TestStatement(this.database, this.sql, parameters);
  }

  async all<Row>(): Promise<{ results: Row[] }> {
    const results = this.database
      .prepare(this.sql)
      .all(...(this.parameters as never[])) as Row[];
    return { results };
  }

  async first<Row>(): Promise<Row | null> {
    const row = this.database
      .prepare(this.sql)
      .get(...(this.parameters as never[])) as Row | undefined;
    return row ?? null;
  }

  async run(): Promise<void> {
    this.database.prepare(this.sql).run(...(this.parameters as never[]));
  }
}

class $TestDatabase {
  database = new DatabaseSync(':memory:');

  constructor() {
    for (const migration of readdirSync(migrationsDirectory).sort()) {
      if (!migration.endsWith('.sql')) continue;
      this.database.exec(
        readFileSync(resolve(migrationsDirectory, migration), 'utf8'),
      );
    }
  }

  prepare(sql: string): $TestStatement {
    return new $TestStatement(this.database, sql);
  }

  async batch(statements: $TestStatement[]): Promise<void> {
    for (const statement of statements) await statement.run();
  }
}

export namespace TestDatabase {
  export const $Class = $TestDatabase;
  export let Class = $Class;
}

// A complete Env for module tests — fake D1 plus the production var
// shapes; secrets are test-local strings. Overrides accept any string:
// wrangler's generated Env narrows vars to literal types, and tests
// need to vary them.
export function makeTestEnv(
  overrides: Partial<Record<keyof Env, unknown>> = {},
): Env {
  return {
    DB: new TestDatabase.Class() as unknown as Env['DB'],
    SITE_ORIGIN: 'https://ivue.dev',
    WORKER_ORIGIN: 'https://newsletter.test',
    SENDER_NAME: 'ivue.dev',
    SENDER_EMAIL: 'newsletter@ivue.dev',
    REPLY_TO: 'newsletter@ivue.dev',
    NOTIFY_EMAIL: 'evgeny@ivue.dev',
    POSTMARK_STREAM: 'newsletter',
    CADENCE_HOURS: '40',
    TURNSTILE_HOSTNAMES: 'ivue.dev',
    TURNSTILE_SECRET: '',
    POSTMARK_SERVER_TOKEN: 'test-postmark-token',
    ADMIN_SECRET: 'test-admin-secret',
    ...overrides,
  } as Env;
}
