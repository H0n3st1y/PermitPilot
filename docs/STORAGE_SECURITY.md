# Storage security guide

Use a private bucket per environment. Authenticate every request, resolve the project owner server-side, generate an opaque object key, inspect actual file signatures, enforce size limits, sanitize display names, and store metadata transactionally. Downloads use short-lived signed URLs or authenticated streaming. Replacements create a new object/version before the old one is retired. Deletion should be queued and audited.

The current MVP validates declared type, size, ownership boundary, and safe basename, but does not write durable objects or scan malware. Do not deploy it for sensitive files until byte-signature validation, malware quarantine/scanning, encryption policy, retention controls, and incident logging are configured.
