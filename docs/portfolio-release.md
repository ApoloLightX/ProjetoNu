# ATLAS portfolio release freeze

This document marks the portfolio release candidate used for the 2026 internship application cycle.

## Scope gate

A feature enters this release only if it materially improves one of four things:

- evidence;
- uncertainty;
- governance;
- engineering reliability.

Anything else is deferred.

## Freeze rule

After this release is merged, changes are limited to:

- production-breaking fixes;
- security fixes;
- broken links or media;
- factual documentation corrections.

No new product feature should enter before the portfolio is reviewed.

## Verified release surfaces

- ATLAS SAC: `https://atlas-sac-ui.vercel.app`
- ATLAS Micro: `https://atlas-sac-ui.vercel.app/micro`
- Risk engine: `https://atlas-sac-web.vercel.app`
- Dependency-aware health check returns database readiness.
- The portfolio media is a real deployed-product browser capture, not an AI-generated product mockup.

## Known, deliberately visible gaps

- shared/platform rate limiting for expensive public endpoints is not yet claimed as active;
- provider backup retention/RPO/RTO is not claimed until verified;
- financial data in ATLAS Micro remains synthetic-only;
- no real Open Finance integration is claimed;
- the statistical model is a synthetic-data baseline and not a production credit model.

These gaps remain visible because the release prioritizes defensible engineering over feature-count inflation.
