# BETHAG — Resend email webhook verification

Date: 2026-11-03

## Production verification

- The Resend webhook `bethag-resend-webhook` is enabled for `email.sent`, `email.delivered`, `email.bounced`, and `email.complained`.
- The webhook validates the Svix signature against the exact raw request body before parsing the JSON payload.
- A replay of the real `email.delivered` event for the controlled test message returned HTTP 200 after granting `service_role` usage on schema `private` and execute on the narrowly scoped private RPC.
- Database verification confirmed the recipient status `delivered`, event type `email.delivered`, provider event ID persisted, and parent communication status `Consegnata`.
- The controlled recipient was `bart_fede@alice.it` only.
- The temporary test condominium member created solely to exercise the email flow was removed after verification. The communication record and recipient delivery audit were retained; the recipient's `member_id` is now NULL by the FK's `ON DELETE SET NULL` behavior.

## Repository parity

- The deployed Production Edge Function source (version 10) is now captured at `supabase/functions/bethag-resend-webhook/index.ts`.
- The exact grant applied to Production is recorded in `supabase/migrations/20261103070901_grant_service_role_private_resend_event_rpc.sql`.
- Production migration ledger reports version `20261103070901` with name `grant_service_role_private_resend_event_rpc`.

## Scope and release decision

This is evidence for the email delivery and webhook status-synchronization path only. It is not a full application acceptance test or approval to launch. Do not deploy this function or apply migrations from this PR to Production merely because the source has been committed. CI and review are required; the broader release checklist and formal cutover approval remain separate gates.
