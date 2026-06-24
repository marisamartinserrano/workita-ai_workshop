---
name: cv-document-upload
description: Architecture and security design for CV document upload with ClamAV scanning
metadata:
  type: design
---

## Upload pipeline

```
Browser → POST /api/profile/upload-cv (multipart)
         │
         ▼
    1. Magic-byte validation (PDF/DOCX only, max 10 MB)
         │
         ▼
    2. ClamAV TCP scan (clamd:3310 INSTREAM protocol)
         │  ┌── VIRUS_DETECTED → 422, reject, no storage
         │  ├── SCANNER_UNAVAILABLE → 503, reject, retry message
         │  └── OK → continue
         │
         ▼
    3. Text extraction (pdf-parse for PDF, mammoth for DOCX)
         │
         ▼
    4. CV content validation (Gemini: "is this a CV?")
         │  └── not CV → 422, ask user to re-upload
         │
         ▼
    5. Save cv_text to profiles table, clear cv_analysis
         │
         └── 200 { ok: true, cv_text }
```

## ClamAV integration

- Sidecar container: `clamav/clamav-daemon:latest`
- Communication: TCP INSTREAM protocol on port 3310 (native Node.js `net` module, no npm dep)
- Virus definitions persisted in `clamav_data` Docker volume (no re-download on restart)
- First start: ~5 min definition download; subsequent starts: ~30 s
- If ClamAV unreachable: reject with 503 (never skip scanning)

## Frontend upload UX

States:
- **Idle**: dashed upload zone (click or drag-and-drop)
- **Processing**: spinner + step label (Uploading → Scanning → Extracting → Validating)
- **Success**: file-info bar with filename + "Replace" button; Analyse CV button enabled
- **Error**: red error card + "Try another file" button (re-shows upload zone)

The raw file is never stored. Only extracted plain text is saved in the `profiles.cv_text` column.
