# Rule and source authoring guide

1. Obtain an official municipal source and record its canonical URL, department, effective/retrieval dates, version hash, and exact location. Never infer a section or quotation.
2. Create the source in `apps/api/app/data/sources.json`. Use `verified` only after human review; use `needs_review` when confirmation is pending.
3. Define the requirement and its configured duration range in `requirements.json`. Dependencies must reference requirement IDs and remain acyclic.
4. Add a rule to `rules.json` with the narrowest required inputs and a plain explanation. Higher priorities run first, while selected requirement IDs remain deduplicated.
5. Add positive, negative, nested-condition, duplicate, and cycle tests. Run `npm run test`.

Source ingestion should normalize PDF/web/manual records into chunks containing document ID, source ID, text, page, heading, department, URL, dates, hash, optional embedding, and verification status. Retrieval ranks verified evidence first and refuses when the evidence threshold is not met. Retrieved text may explain a rule but never mutate its result.
