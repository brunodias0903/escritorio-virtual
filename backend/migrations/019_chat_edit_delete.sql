-- Suporte a edição e exclusão ("apagar para todos") de mensagens no chat
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS edited_at bigint,
  ADD COLUMN IF NOT EXISTS deleted_at bigint;
