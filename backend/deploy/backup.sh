#!/bin/sh
# Cópia de segurança do banco: um arquivo .sql.gz por vez, guardando só as últimas.
#   BACKUP_INTERVAL_SECONDS  tempo entre cópias (padrão: 86400, um dia)
#   BACKUP_KEEP              quantas cópias manter (padrão: 7)
#   BACKUP_ONCE=1            faz uma cópia e sai (para testar)
# Para restaurar: gunzip -c virtual-office-AAAAMMDD-HHMMSS.sql.gz | psql -U virtual_office virtual_office
set -eu

DIR=/backups
KEEP="${BACKUP_KEEP:-7}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

while true; do
  FILE="$DIR/virtual-office-$(date +%Y%m%d-%H%M%S).sql.gz"
  # Grava em arquivo temporário e renomeia: nunca deixa uma cópia pela metade.
  if pg_dump -h postgres -U virtual_office virtual_office | gzip > "$FILE.tmp"; then
    mv "$FILE.tmp" "$FILE"
    echo "[backup] $FILE ($(du -h "$FILE" | cut -f1))"
  else
    rm -f "$FILE.tmp"
    echo "[backup] FALHOU" >&2
  fi
  ls -1t "$DIR"/virtual-office-*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
  [ "${BACKUP_ONCE:-}" = "1" ] && exit 0
  sleep "$INTERVAL"
done
