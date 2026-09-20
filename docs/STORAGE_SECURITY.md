# Storage security guide

## Current web app (browser-only)

- Project records live in `localStorage` under `permitpilot:project:<id>`. They are versioned (`schemaVersion: 2`) and validated and migrated on load by `normalizeProject` in `lib/storage/projects.ts`. A corrupt record shows an error page; it is never silently replaced.
- Uploaded file bytes live in IndexedDB (`permitpilot-files`, keyed by document ID; see `lib/storage/files.ts`). Metadata stays on the project record. Replaced or removed uploads, and uploads for steps removed by re-running the rules, are deleted from IndexedDB.
- Uploads are limited to PDF, PNG, JPEG, and WebP, 10 MB or less, and file names are sanitized. The declared MIME type, size, and leading byte signature must agree. Files are never sent to a server and are not malware-scanned.
- Save failures, such as a full quota, are reported to the user and the on-screen state is not updated, so unsaved progress is never shown as saved.

## Before handling real user data on a server

Use a private bucket per environment. Authenticate every request, resolve the project owner server-side, generate an opaque object key, inspect the actual file signature, enforce size limits, sanitize display names, and store metadata transactionally. Serve downloads through short-lived signed URLs or authenticated streaming. Create the replacement object or version before retiring the old one. Queue and audit deletion. Add malware quarantine and scanning, an encryption policy, retention controls, and incident logging before storing sensitive files.
