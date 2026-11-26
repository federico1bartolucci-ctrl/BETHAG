# Insurance policy load errors and context-safe visibility — 2026-11-26

## Finding

The inline insurance-policy component now rejects stale asynchronous responses and clears rows on condominium changes, but two gaps remain:
- React can render once with the new condominium prop before the effect clears the previous condominium's rows.
- A current load failure is only written to the console, so the user sees the misleading empty state and cannot distinguish a load failure from having no policies.

## Correction

- Derive visible rows from the condominium ID that produced them, hiding old rows immediately on a prop change.
- On a current load failure, clear the old rows, associate the failure with the requested condominium, and show an accessible alert.
- Ignore stale failures using the same latest-request guard already used by the component.
- Surface unavailable Supabase/workspace/condominium lookup as explicit load errors.

## Regression

A deterministic runtime test verifies immediate scope hiding, current failure clearing and error display state, and stale failure rejection. The test is included in npm test.

## Safety

No Supabase calls are made by the regression. No QA/Production access or writes, migrations, resets, deployments or paid services.
