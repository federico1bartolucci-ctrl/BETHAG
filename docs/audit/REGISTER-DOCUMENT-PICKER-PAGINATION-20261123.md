# Register Document Picker Pagination — 2026-11-23

## Finding
The Register page loaded the workspace document collection through one unpaginated Supabase query. The picker can omit documents when the workspace exceeds the API row cap.

## Fix
- Reuse the keyset-based workspace pagination helper introduced in PR #328.
- Keep workspace scope on each page.
- Order by document creation timestamp with stable ID tie-break.
- Propagate page failures rather than accept partial document lists.

## Regression
A static integration guard verifies the Register document picker uses the shared paginated loader and wires the returned collection into state. Existing shared pagination runtime regression exercises keyset paging, concurrency mutation, NULL cursors, scope and error cases.

## Verification
Source, test and package wiring are re-fetched and statically checked. CI required for closure.

## Dependency
Stacked on PR #328, which introduces the shared workspace pagination helper.

## Safety
Draft only. No merge, deployment, QA/Production data changes or resets.
