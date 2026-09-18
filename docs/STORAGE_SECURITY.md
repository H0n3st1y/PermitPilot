# Storage security guide

## Current web app (browser-only)

- Project records live in `localStorage` under `permitpilot:project:<id>`. They are versioned (`schemaVersion: 2`) and validated and migrated on load by `normalizeProject` in `lib/storage/projects.ts`. A corrupt record shows an error page; it is never silently replaced.
- Uploaded file bytes live in IndexedDB (`permitpilot-files`, keyed by document ID; see `lib/storage/files.ts`). Metadata stays on the project record. Replaced or removed uploads, and uploads for steps removed by re-running the rules, are deleted from IndexedDB.
- Uploads are limited to PDF, PNG, JPEG, and WebP, 10 MB or less, and file names are sanitized. The declared MIME type is checked, not the file's byte signature. Files are never sent to a server.
- Save failures, such as a full quota, are reported to the user and the on-screen state is not updated, so unsaved progress is never shown as saved.

## Before handling real user data on a server

Use a private bucket per environment. Authenticate every request, resolve the project owner server-side, generate an opaque object key, inspect the actual file signature, enforce size limits, sanitize display names, and store metadata transactionally. Serve downloads through short-lived signed URLs or authenticated streaming. Create the replacement object or version before retiring the old one. Queue and audit deletion.

The FastAPI prototype in `apps/api` validates declared type, size, the ownership boundary, and a safe basename. It does not write durable objects or scan for malware. Do not deploy it for sensitive files until byte-signature validation, malware quarantine and scanning, an encryption policy, retention controls, and incident logging are in place.
