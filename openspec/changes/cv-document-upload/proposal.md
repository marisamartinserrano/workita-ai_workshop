---
name: cv-document-upload
description: Replace CV paste textarea with secure document upload (PDF/DOCX) with ClamAV virus scanning and AI content validation
metadata:
  type: proposal
---

## What

Replace the CV text paste area in the CV Analysis section with a document upload flow. Users upload a PDF or DOCX file. Every uploaded file is scanned for malware by ClamAV before any text is extracted or saved. If the document is not a CV, the user is asked to re-upload.

## Why

- **Security**: file uploads must be scanned for malware before they reach the database or VM storage
- **UX**: uploading a file is more natural and reliable than manually pasting CV text
- **Data quality**: AI validation rejects non-CV documents early, keeping the profile data clean

## Non-goals

- Store the raw file on disk or in the database (only extracted text is saved)
- Support legacy `.doc` binary format (DOCX and PDF only)
- Asynchronous scanning (scan is synchronous, blocking the response until safe)
