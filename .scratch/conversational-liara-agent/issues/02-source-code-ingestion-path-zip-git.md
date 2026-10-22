# 02: Multi-Source Code Ingestion (Path, ZIP Upload, Git Clone)

**What to build:**
A unified source ingestion subsystem and chat widget (`SourceInputWidget`). Users can specify a local path (with quick preset buttons for sample apps), drag-and-drop a ZIP archive that extracts safely into `.workspace/<session_id>/`, or provide a public Git repository URL that is cloned securely without path traversal vulnerabilities.

**Blocked by:** 01 (Persian Chat Shell and Sidecar Console Layout)

**Status:** resolved

- [x] Interactive `SourceInputWidget` rendered in chat with 3 tabs: Local Path, ZIP Upload, Git Clone
- [x] Backend ingestion API (`POST /api/project/ingest`) handling directory validation, safe ZIP extraction, and Git cloning
- [x] Path traversal validation preventing extraction or reading outside the intended workspace jail
- [x] Quick-select preset buttons for demo projects (`sample-apps/nodejs-demo`)
- [x] Automated tests for ZIP extraction security and invalid input rejection

