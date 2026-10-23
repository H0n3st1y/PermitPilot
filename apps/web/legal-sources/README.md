# Legal sources

Official pages are downloaded into `raw/{STATE}/` from `manifest.json`.
Those copies are demonstration excerpts for PermitPilot.

The live app never crawls the web. Citation matching reads these files and,
if an API key is set, asks Claude to attach quotes to steps that the rules
engine already selected.

`needs_review` items must not be copied into `fixtures/rules.ts` until someone
promotes them.
