import { newDb } from 'pg-mem';
import { describe, expect, it } from 'vitest';
import { runMigrations } from './migrate.js';
import type { SqlClient } from './sql-client.js';

describe('migrações', () => {
  it('aplicam uma vez só e na ordem', async () => {
    const { Pool } = newDb().adapters.createPg();
    const db = new Pool() as unknown as SqlClient;
    const migrations = [
      { name: '001_a.sql', sql: 'CREATE TABLE a (id int)' },
      { name: '002_b.sql', sql: 'CREATE TABLE b (id int)' },
    ];
    expect(await runMigrations(db, migrations, { lock: false })).toEqual([
      '001_a.sql',
      '002_b.sql',
    ]);
    expect(await runMigrations(db, migrations, { lock: false })).toEqual([]);
  });

  it('desfaz e informa quando uma migração falha', async () => {
    const { Pool } = newDb().adapters.createPg();
    const db = new Pool() as unknown as SqlClient;
    const migrations = [{ name: '001_ruim.sql', sql: 'CREATE TABLE ruim (' }];
    await expect(
      runMigrations(db, migrations, { lock: false }),
    ).rejects.toThrow('Falha na migração 001_ruim.sql');
  });

  it('usa a trava do Postgres quando pedida', async () => {
    const calls: string[] = [];
    const db: SqlClient = {
      query: async (text) => {
        calls.push(text.split(/\s+/).slice(0, 2).join(' '));
        return { rows: [], rowCount: 0 };
      },
    };
    await runMigrations(db, [], { lock: true });
    expect(calls[0]).toBe('SELECT pg_advisory_lock($1)');
    expect(calls.at(-1)).toBe('SELECT pg_advisory_unlock($1)');
  });
});
