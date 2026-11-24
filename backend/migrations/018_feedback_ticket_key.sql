-- Tag sequencial estilo Jira (EV-1, EV-2, ...) para tickets de feedback
CREATE SEQUENCE IF NOT EXISTS feedback_ticket_seq START 1;

ALTER TABLE feedback_items
  ADD COLUMN IF NOT EXISTS ticket_key text;

UPDATE feedback_items
SET ticket_key = 'EV-' || nextval('feedback_ticket_seq')::text
WHERE ticket_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_items_ticket_key
  ON feedback_items (ticket_key)
  WHERE ticket_key IS NOT NULL;
