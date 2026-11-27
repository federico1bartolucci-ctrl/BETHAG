# Local calendar dates for technical-register activity defaults

## Finding
Three technical-register activity handlers used a fixed seven-times-24-hour offset followed by UTC ISO formatting when no explicit deadline was available. Near local midnight this could produce the previous calendar day; fixed-duration arithmetic could also drift across daylight-saving transitions.

## Correction
- Add `localISODateAfterDays` using local `Date.setDate` calendar arithmetic.
- Use it for work-deadline, work-activity and register-expiry fallbacks.
- Preserve explicit work and expiry dates unchanged.

## Regression
The test runs in `Europe/Rome` and verifies local-midnight and spring-DST cases, checks all three handler call sites, and is wired into `npm test`. The existing ledger-date test also strips the helper's TypeScript parameter annotation before isolated Node execution.

## Safety
Frontend date helper, three activity defaults, tests and documentation only. No migrations, QA/Production access or writes, Supabase deployment, reset or paid service activation.
