/** Server-only PostgreSQL access for UNIBUD. */
import { DATABASE_URL_VARS, resolveDatabaseUrl } from "./database-url";

export type DbSource = "postgres";

const databaseUrl = resolveDatabaseUrl();

export const dbSource: DbSource = "postgres";

export interface Sql {
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (value: string) => value;
type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) => run<T>(text, params);
  return sql;
}

const globalRef = globalThis as typeof globalThis & { __pgSqlPromise__?: Promise<Sql> };

function createPostgresSql(): Promise<Sql> {
  globalRef.__pgSqlPromise__ ??= (async () => {
    const { Pool, types } = await import("pg");
    types.setTypeParser(OID_INT8, Number);
    types.setTypeParser(OID_DATE, identity);
    types.setTypeParser(OID_INTERVAL, identity);
    if (!databaseUrl) {
      throw new Error(
        `A PostgreSQL connection string (${DATABASE_URL_VARS}) is required for UNIBUD database operations. Configure it in the deployment environment.`,
      );
    }
    const pool = new Pool({ connectionString: databaseUrl });
    return toSql(async <T>(text: string, params: unknown[]) => (await pool.query(text, params)).rows as T[]);
  })().catch((error) => {
    globalRef.__pgSqlPromise__ = undefined;
    throw error;
  });
  return globalRef.__pgSqlPromise__;
}

export function getSql(): Promise<Sql> {
  return createPostgresSql();
}

export function ensureDbReady(): Promise<void> {
  return Promise.resolve();
}

