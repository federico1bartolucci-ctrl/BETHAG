# Audit — Resend terminal failure webhook events

**Date:** 26 November 2026  
**Scope:** Resend delivery-state reconciliation; proposed forward migrations only.

## Finding reproduced

The existing `private.apply_resend_communication_event` recognized `email.sent`, `email.delivered`, `email.bounced` and `email.complained` as delivery-state events. Resend also emits `email.failed` and `email.suppressed`.

Before this correction, those two event types were recorded in `event_type` and `provider_event_id`, but the recipient status was left unchanged. A recipient could therefore remain `queued` or `sent`, and the parent communication could remain `In elaborazione`, despite a terminal provider failure.

The runtime regression executes the actual baseline SQL function first and reproduces both cases before applying the proposed correction.

## Correction

- Treat `email.failed` and `email.suppressed` as terminal delivery-state events with the `failed` recipient status.
- Include both events in the duplicate/stale event cursor and give them the same terminal priority as bounce/complaint events.
- Store a specific event marker in `error_message`.
- Repair legacy rows whose previous webhook processing recorded one of these events but left the recipient pending/queued/sent.
- Replace any older status-event ID with the actual failed/suppressed provider event ID when repairing the cursor, so the cursor timestamp and event identity remain paired.
- Recompute only affected parent communication aggregates after the repair.
- Preserve rows already marked `delivered`; the repair never downgrades a delivered outcome.
- Keep `email.delivery_delayed` informational because Resend treats it as a temporary delivery issue and may retry delivery.

Both the event-order and serialized-aggregate function definitions are kept aligned.

## Regression

`scripts/test-resend-webhook-event-order.mjs` is already part of `npm test`; it now verifies:

- baseline reproduction for `email.failed` and `email.suppressed`;
- migration repair of already-recorded events and parent aggregates;
- replacement of a pre-existing `email.sent` cursor ID with the repaired terminal event ID;
- new failed and suppressed events;
- stale/equal-time success events cannot downgrade a terminal failure;
- duplicate terminal events are ignored;
- a previously delivered recipient remains delivered during legacy repair;
- `email.delivery_delayed` does not become a terminal failure or advance the status cursor;
- existing complaint/bounce ordering and informational-event behavior remain intact.

## Migration and environment safety

The changes are confined to:

- `supabase/rebuild/proposed-forward-migrations/20261123090000_guard_resend_webhook_status_event_order.sql`
- `supabase/rebuild/proposed-forward-migrations/20261125054500_serialize_resend_webhook_communication_aggregate.sql`

No canonical `supabase/migrations` file or Production manifest is changed. The proposed migrations are not applied to QA or Production.

No QA/Production access or writes, merge, deployment, reset, or manual workflow dispatch is performed.

## Provider references

- [Resend — email.failed](https://resend.com/docs/webhooks/emails/failed)
- [Resend — email.suppressed](https://resend.com/docs/webhooks/emails/suppressed)
- [Resend — email event types](https://resend.com/docs/webhooks/event-types)
- [Resend — webhook event visibility](https://resend.com/changelog/webhook-event-visibility)
