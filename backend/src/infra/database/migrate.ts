import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SqlClient } from './sql-client.js';

export type Migration = { name: string; sql: string };

/** Lê os arquivos .sql da pasta, em ordem de nome (001_..., 002_...). */
export const loadMigrations = (dir: string): Migration[] =>
  readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => ({
      name: file,
      sql: readFileSync(join(dir, file), 'utf8'),
    }));

/** Cliente com conexão fixa, necessário para transação e trava. */
export type MigrationClient = SqlClient;

// Número qualquer, igual em todas as instâncias, para a trava do Postgres.
const LOCK_ID = 727_274;

const UNDEFINED_TABLE = '42P01';

const isMissingTable = (error: unknown): boolean => {
  const { code, message } = error as { code?: string; message?: string };
  return (
    code === UNDEFINED_TABLE ||
    /relation .* does not exist/i.test(message ?? '')
  );
};

/** Nomes já aplicados. Cria a tabela de controle na primeira vez. */
const appliedNames = async (client: MigrationClient): Promise<Set<unknown>> => {
  try {
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    return new Set(rows.map((row) => row.name));
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    await client.query(
      'CREATE TABLE schema_migrations (name text PRIMARY KEY, applied_at bigint NOT NULL)',
    );
    return new Set();
  }
};

/**
 * Aplica as migrações que ainda não rodaram. Cada uma roda numa transação.
 * Com `lock`, instâncias que sobem juntas esperam a vez em vez de brigar.
 * Devolve os nomes aplicados agora.
 */
export const runMigrations = async (
  client: MigrationClient,
  migrations: Migration[],
  { lock = true }: { lock?: boolean } = {},
): Promise<string[]> => {
  if (lock) await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
  try {
    const done = await appliedNames(client);
    const applied: string[] = [];
    for (const migration of migrations) {
      if (done.has(migration.name)) continue;
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (name, applied_at) VALUES ($1, $2)',
          [migration.name, Date.now()],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Falha na migração ${migration.name}`, {
          cause: error,
        });
      }
      applied.push(migration.name);
    }
    return applied;
  } finally {
    if (lock) await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
  }
};
