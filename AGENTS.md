# Repository Instructions

Use `project-context-os` only when work changes, audits, reconstructs, or hands
off durable project context. For routine implementation and diagnosis, inspect
only task-relevant source, tests, configuration, and canonical sections.

## Evidence and decisions

- Repository evidence governs implementation state. Explicit accepted decisions
  govern intended direction.
- Do not promote proposed or inferred claims into accepted decisions.
- Do not turn a suggested tool, platform, or workflow into a requirement without
  explicit acceptance.
- Preview changes to accepted direction, architecture, privacy, security,
  clinical safety, ADRs, or the canonical artifact system before editing them.
- Update `docs/project/status.md` only after verified work materially changes the
  recorded project state.
- Run relevant checks and report unavailable checks, contradictions, limitations,
  and remaining unknowns.

## Clinical safety

- Dr. Mate may support, but must not silently replace, the clinician's decision.
- A contact-lens matching result is a list of explainable candidates, not a prescription or a claim of clinical suitability.
- Keep manufacturer facts, clinician-authored rules, patient observations, and system outputs distinguishable and traceable.
- Never infer a missing clinical value. Preserve it as unknown and show its effect on the result.
- Do not commit identifiable patient data, credentials, or private clinical exports to the repository.
- New or changed governing decisions about clinical matching, catalog storage,
  provenance, privacy, or security require an ADR; implementation of an already
  accepted decision does not require a new ADR.
