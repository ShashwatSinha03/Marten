# Repository Guidelines

> **Established:** Sprint 0.5 (Stabilization & Type Safety)
> **Status:** Frozen — do not modify without architecture review

## Purpose

Repositories encapsulate persistence concerns and provide a clean boundary
between the database and the application domain. This document defines how
Marten's repositories should behave.

---

## Repository contract

| Method | Returns | Query style | When to use |
|---|---|---|---|
| `findById` | `IInvestigation \| null` | `.lean()` | Read-only lookups |
| `findByReportId` | `IInvestigation \| null` | `.lean()` | Report page |
| `findByShareToken` | `IInvestigation \| null` | `.lean()` | Shared report access |
| `findByUserId` | `DashboardResult` | `.lean()` + projection | Dashboard listing |
| `create` | `IInvestigationDocument` | full document | Pipeline start |
| `updateStatus` | `void` | `updateOne` | State transitions |
| `saveGraph` | `void` | `updateOne` | Graph persistence |
| `saveReport` | `void` | `updateOne` | Report persistence |
| `markComplete` | `void` | `updateOne` | Terminal state |

### Rule: Read queries use `.lean()`

All read-only queries use `.lean()` to return plain JavaScript objects.
This avoids loading full Mongoose documents with change tracking and virtuals
when they aren't needed.

### Rule: Write mutations use `updateOne`

All partial updates use `updateOne()` with `$set` rather than loading,
mutating, and saving the full document. This is more efficient and avoids
race conditions.

### Rule: Create returns the full document

`create()` returns the full `IInvestigationDocument` (or similar) because
the caller needs the document for pipeline flow. The returned document
has the `.id` virtual and all Mongoose methods available.

---

## Return types

### Lean queries

Lean query result types (e.g. `IInvestigation`, `IEvidenceRecord`) declare
`_id?: Types.ObjectId` as an optional field. This reflects that:

- `_id` is always present in query results unless explicitly excluded via projection
- Making it optional prevents accidental use without a null check
- Routes should use `_id!.toString()` with a non-null assertion (safe in practice)

### Full documents

Full document types (e.g. `IInvestigationDocument`, `IEvidenceRecordDocument`)
declare:
- `_id: Types.ObjectId` — the actual MongoDB ObjectId
- `id: string` — the Mongoose virtual getter
- Both are always available at runtime on document instances

### Dashboard queries

`findByUserId` returns a projected subset of fields in `DashboardResult`.
The `data` field is typed as `Array<Record<string, unknown>>` intentionally —
the caller maps the projection to API response fields.

---

## ObjectId validation

Every repository method that accepts a string `id` parameter validates it
via `Types.ObjectId.isValid()` before use:

```typescript
private toObjectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
  return new Types.ObjectId(id);
}
```

Methods that accept optional or user-facing IDs return `null` or `[]` for
invalid IDs rather than throwing:

```typescript
async findById(id: string): Promise<IInvestigation | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  // ...
}
```

---

## Serialization boundary

Repositories return **database-shaped objects** (either lean plain objects
or full documents). They do NOT return DTOs. The serialization to
API-response shape happens in the route handler.

```
Repository (lean/doc)  ──►  Route handler  ──►  API response (DTO)
```

Route handlers are responsible for:
- Converting `_id` to `id` via `_id!.toString()`
- Converting `Date` fields to ISO 8601 strings
- Selecting only the fields needed for the response
- Renaming fields to match the API contract
