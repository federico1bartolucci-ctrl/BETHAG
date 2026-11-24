# Audit — Supabase availability during workspace backup restore

Finding: restoreWorkspaceBackup guarded backend writes with if (supabase), but the final success branch did not distinguish a missing Supabase client. When VITE_SUPABASE_ENABLE=false or the Supabase URL/publishable key is absent, the restore loop is skipped while frontend state/localStorage can still be updated and the UI reports a full restore.

Impact: a backup containing backend rows can appear fully restored even though none of those backend rows were written. The local UI can then diverge from the database.

Correction:
- Add a read-only availability decision before either confirmation and before React/localStorage/backend mutations.
- Block the entire restore when Supabase is unavailable and any restorable backend table contains rows or malformed payload.
- Permit local-only restore only when no restorable backend rows are present.
- Use an explicit local-only completion notice instead of claiming full restore success.
- Exclude authorization/workflow tables already intentionally skipped by the restore policy from the backend-row availability decision.

Regression: scripts/test-backup-restore-requires-supabase.mjs executes the production helper and verifies restore-handler ordering and npm test wiring.

Safety: isolated Draft follow-up stacked on PR #422. No QA/Production access or writes, no merge, deploy, reset, or manual workflow dispatch.
