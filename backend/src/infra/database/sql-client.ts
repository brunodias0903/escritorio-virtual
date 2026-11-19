/** O mínimo de `pg.Pool` / `pg.PoolClient` que usamos. Facilita testar com pg-mem. */
export type SqlClient = {
  query: (
    text: string,
    values?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
};

const UNIQUE_VIOLATION = '23505';

export const isUniqueViolation = (error: unknown): boolean =>
  (error as { code?: string }).code === UNIQUE_VIOLATION;
