---
title: "Contact-lens knowledge catalog and explainable matching"
status: "accepted"
date: "2026-07-28"
supersedes: "none"
superseded_by: "none"
---

# ADR: Contact-lens knowledge catalog and explainable matching

## Context

Dr. Mate needs one body of contact-lens knowledge for two consumers:

1. a fast interactive reference for the clinician;
2. an explainable candidate-generation module using clinical inputs.

Manufacturer information is spread across dynamic web pages, product brochures,
parameter guides, fitting guides, diagrams, and package inserts. These sources can
have different publication dates and may describe different kinds of knowledge:
product facts, initial diagnostic fitting, fit evaluation, or troubleshooting.

The module is clinically high-risk. It must preserve provenance, distinguish missing
data from negative data, avoid silent conflict resolution, and never present a
candidate as a prescription.

Flexlens PRS is the first pilot product. The manufacturer material reviewed for the
pilot includes the current product page, the PRS brochure, the PRS Basic Fitting
Information sheet, and the 2022 Flexlens parameter guide.

The clinician confirmed the intended interpretation of the PRS fitting material:

- `8.7 / 15.0 mm` is the recommended average first diagnostic lens;
- central keratometry has limited value for choosing that first lens;
- the pre-op/post-op K table describes the published relationship between K ranges
  and lens ranges; it is not a competing first-lens selection algorithm.

Kazakhstan availability/registration is outside the current scope. Explicit
contraindications will be modeled later after relevant package inserts are reviewed.

## Decision

### Canonical data

- Human-reviewable YAML records are the canonical catalog and ruleset data.
- Pydantic models are the executable schema and validation contract.
- SQLite or another database may be generated later as an index or runtime store,
  but it is not the source of truth for the MVP.
- Full source PDFs and page captures remain in an ignored local cache by default.
  Git stores source metadata, URL, document revision, retrieval date, SHA-256 when
  available, and precise evidence locators.

### Provenance and review

- Manufacturer facts, clinician interpretations, case observations, and matching
  results are distinct data types.
- Every clinically meaningful catalog claim and rule references one or more immutable
  source revision IDs.
- A source conflict is never silently overwritten. Precedence can guide human review,
  but cannot automatically erase contradictory evidence.
- External extraction is untrusted until schema validation and clinical review.

### Versioning

Four independent version coordinates are recorded:

1. `schema_version` for data compatibility;
2. immutable manufacturer `source_revision` records;
3. `catalog_version` plus integer product `record_version`;
4. semantic `ruleset_version`.

A matching result records the exact product revision, catalog version, ruleset
version, and source revision IDs used. Active records are not edited in place when a
clinical meaning changes; a new revision/version is created.

### Matching

- The matcher uses a small declarative condition language interpreted by application
  code. Arbitrary Python, `eval`, generated code, and LLM-only decisions are forbidden.
- Rule phases are separated:
  - candidate relevance;
  - parameter compatibility;
  - initial diagnostic fitting;
  - fit evaluation;
  - troubleshooting.
- Each condition evaluates to `true`, `false`, or `unknown`.
- Each rule can return a distinct outcome for all three states.
- The initial outcome vocabulary is:
  - `supported_candidate`;
  - `insufficient_data`;
  - `manual_review`;
  - `outside_published_spec`;
  - `contraindicated`;
  - `information`.
- Absence of a published indication is not a contraindication.
- Unknown clinical values are not replaced by defaults.
- Weighted ranking and a single compatibility percentage are not used in the MVP.
- The clinician remains the final decision-maker. Matching output is an explainable
  candidate assessment, not a prescription or order.

### Flexlens PRS pilot

- The PRS product record stores published ranges, materials, indications, design
  facts, initial diagnostic guidance, fit criteria, and the K-range reference table.
- The K-range table is stored as reference guidance, not as an executable first-lens
  selection rule.
- Matching rules initially cover published indication relevance, requested power
  range, the special 74% material adjustment, and post-placement fit criteria.
- No contraindication rule is activated until the relevant source is reviewed.

## Alternatives considered

### Live website as the source of truth

Rejected. Dynamic content can change without notice, disappear, or expose different
revisions in different linked documents.

### Spreadsheet as the canonical catalog

Rejected as the long-term authority. A spreadsheet is useful for import and review,
but is weak for nested constraints, provenance, rule versions, and automated
validation.

### Database-first catalog

Deferred. It adds migrations and operational state before the knowledge model is
stable. A database may later be generated from the reviewed YAML release.

### Commit all manufacturer PDFs

Rejected by default because of repository size, redistribution/licensing uncertainty,
and unnecessary duplication. A private archival strategy may be decided later.

### Weighted score or AI-only matching

Rejected for the MVP. It would obscure why a model was included or excluded and make
clinical changes difficult to reproduce.

## Consequences

Positive:

- product facts and matching behavior are reviewable in Git;
- historical results can be reproduced;
- source updates do not silently alter active clinical behavior;
- rules can be tested without a UI or patient database;
- the same catalog can support manual search and Dr. Mate candidate generation.

Negative:

- YAML records are more verbose than a simple product table;
- every meaningful update requires review and version maintenance;
- source PDFs may need to be downloaded again if the local cache is lost;
- the initial rule language intentionally supports fewer operations than Python.

Neutral:

- a relational database and interactive UI remain future implementation choices;
- real patient persistence and authorization are not decided by this ADR.

## Risks

- a source may be stale even when it remains available;
- manufacturer documents may disagree or use ambiguous wording;
- an incorrect evidence locator can make a valid-looking fact unauditable;
- a clinician-authored interpretation may later need to be revised;
- callers could mislabel a candidate as a prescription unless UI wording preserves
  the safety boundary.

Mitigations include immutable source revisions, explicit review status, schema
validation, three-valued condition evaluation, inactive unsupported rules, test
fixtures, and visible explanations.

## Verification

Implementation is verified only when:

- source, product, and ruleset YAML files validate through the Pydantic loaders;
- matcher tests cover true, false, and unknown outcomes;
- tests confirm that absence of an indication is not treated as a contraindication;
- tests confirm that out-of-range power is distinguishable from contraindication;
- tests confirm that the PRS K table does not select the first trial lens;
- tests confirm that results retain product, catalog, ruleset, and source versions;
- the complete existing project test suite passes.

Clinical correctness outside the reviewed PRS facts is not claimed.

## Supersedes

None.

## Superseded by

None.
