# Document Identity Strategy

> **Established:** Sprint 0.5 (Stabilization & Type Safety)
> **Status:** Frozen — do not modify without architecture review

## Overview

Marten uses MongoDB via Mongoose. MongoDB documents use `_id` (BSON ObjectId) as their
primary key. Mongoose provides a virtual getter `.id` that returns `_id.toString()`.

This document defines where `_id` and `id` exist, how to convert between them, and
when each form should be used.

---

## Where `_id` exists

| Layer | Interface | Field | Type |
|---|---|---|---|
| MongoDB document | — | `_id` | `ObjectId` (BSON) |
| Mongoose document | `IInvestigationDocument` | `_id` | `Types.ObjectId` |
| Mongoose document | `IEvidenceRecordDocument` | `_id` | `Types.ObjectId` |
| Lean query result | `IInvestigation` | `_id` | `Types.ObjectId` (optional) |
| Lean query result | `IEvidenceRecord` | `_id` | `Types.ObjectId` (optional) |

## Where `id` exists

| Layer | Interface | Field | Type | Source |
|---|---|---|---|---|
| Mongoose document | `IInvestigationDocument` | `id` | `string` | Virtual (`_id.toString()`) |
| Mongoose document | `IEvidenceRecordDocument` | `id` | `string` | Virtual (`_id.toString()`) |
| Subdocument node | `IGraphNode` | `id` | `string` | UUID |
| Subdocument edge | `IGraphEdge` | `id` | `string` | UUID |
| Finding | `IFinding` | `findingId` | `string` | UUID |
| Report | `IReport` | `reportId` | `string` | UUID |

---

## Conversion rules

```
Document._id (Types.ObjectId)  ──►  document.id (string, via Mongoose virtual)
Lean result._id (Types.ObjectId)  ──►  ._id.toString() (string, explicit)
API response                     ──►  always _id.toString() (explicit, never virtual)
```

---

## When to use each form

### Pipeline code (orchestrator, evidence-collector, evidence-store, graph-builder)

Use **`.id`** (the string virtual):

```typescript
// ✅ Correct — IEvidenceRecordDocument.id is declared as string
const itemId = record.id;

// ❌ Wrong — _id.toString() in pipeline code is unnecessarily verbose
const itemId = record._id.toString();
```

This is safe because pipeline code operates on full Mongoose documents returned
from `create()` or `save()`, not lean queries. The virtual `.id` always exists.

### API routes (serialization boundary)

Use **`._id!.toString()`** (explicit conversion):

```typescript
// ✅ Correct — explicit serialization at the API boundary
const investigationData = {
  id: inv._id!.toString(),
  // ...
};

// ❌ Wrong — relying on virtual at serialization boundary
const investigationData = {
  id: inv.id,
  // ...
};
```

This is necessary because API routes may receive data from lean queries
(which lack the `.id` virtual) or from documents. Explicit conversion ensures
consistency regardless of source.

### Subdocuments

Graph nodes, edges, findings, and reports use UUID strings for their IDs.
These are generated with `crypto.randomUUID()` and stored as plain strings.
No conversion is needed.

---

## Why this strategy

1. **Mongoose virtual `.id` is reliable** — it has existed since Mongoose 2.x and
   always returns `_id.toString()`. Using it internally avoids repetitive
   `.toString()` calls.

2. **Explicit conversion at API boundaries** ensures responses are consistent
   regardless of whether the source was a Document or a lean query result.

3. **No mixed conventions** — every layer has a single, clear pattern.

4. **TypeScript knows about both `_id` and `id`** — the interfaces declare both,
   so no unsafe casts or intersection types are needed.
