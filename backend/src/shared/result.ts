/** Resultado de operação de domínio que pode falhar com um código de erro. */
export type Result<T, E extends string = string> =
  { ok: true; value: T } | { ok: false; error: E };

/** Resultado de operação HTTP que carrega o código de status em caso de falha. */
export type HttpResult<T, E extends string = string> =
  { ok: true; value: T } | { ok: false; status: number; error: E };

export const ok = <T>(value: T): { ok: true; value: T } => ({
  ok: true,
  value,
});

export const fail = <E extends string>(error: E): { ok: false; error: E } => ({
  ok: false,
  error,
});

export const httpFail = <E extends string>(
  status: number,
  error: E,
): { ok: false; status: number; error: E } => ({
  ok: false,
  status,
  error,
});
