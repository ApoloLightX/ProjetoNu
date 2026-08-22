# Security policy

ATLAS SAC is a public portfolio and engineering-research project. Security reports are welcome, especially when they affect credential exposure, authorization boundaries, evidence provenance, prompt-injection controls, persistence integrity or public API abuse.

## Supported code

Security fixes are applied to the current `main` branch. Historical demo branches and old preview deployments are not treated as supported releases.

## Reporting a vulnerability

Prefer GitHub private vulnerability reporting / a private security advisory when that option is available for the repository.

If a private reporting channel is not available, open a minimal GitHub issue asking for a private contact path **without posting exploit details, credentials, personal data or a working proof of compromise in public**.

Please include, when safe:

- affected route/component;
- expected vs actual behavior;
- impact;
- minimal reproduction steps;
- whether credentials or real third-party data may have been exposed.

## Do not include secrets

Never paste API keys, service-role credentials, access tokens, passkeys/private-key material or unredacted sensitive data into public issues, pull requests or screenshots.

If a credential is exposed, treat it as compromised and rotate/revoke it rather than relying on deletion from Git history alone.

## Security boundaries that matter in ATLAS

- Supabase service-role and AI provider credentials are backend-only.
- Public CNPJ registry context is not an adverse SAC signal (`risk_signal=false`).
- Synthetic SAC signals must not be represented as real findings about a real company.
- LLM output cannot rewrite deterministic scores or remove mandatory human review.
- Evidence content is untrusted input and cannot redefine the AI task/policy.
- Persistence tables use RLS and server-only privileged write paths.
- Public/expensive endpoints require shared/platform rate limiting before the project claims abuse protection at production scale.

## Scope note

ATLAS is not a production credit-decision system and does not claim regulatory, legal or financial-decision suitability. A security report can still be valid even when it concerns a research/demo feature.
