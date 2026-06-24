## 1. Dependencies

- [x] 1.1 Add `pdf-parse` and `mammoth` to `package.json` dependencies
- [x] 1.2 Change `npm ci` to `npm install` in `Dockerfile` so new packages install during image build

## 2. Infrastructure

- [x] 2.1 Add `clamav` service (`clamav/clamav-daemon:latest`) to `docker-compose.yml` with `clamav_data` volume
- [x] 2.2 Add `clamav` to `app` service `depends_on` in `docker-compose.yml`

## 3. Backend

- [x] 3.1 Add `isCvContent(text)` export to `src/flows/cvAnalysis.ts` — calls Gemini to confirm document is a CV
- [x] 3.2 Add `scanWithClamav(buffer)` helper in `src/index.ts` — TCP INSTREAM protocol, throws on virus/unavailable
- [x] 3.3 Add `extractText(buffer, type)` helper in `src/index.ts` — pdf-parse for PDF, mammoth for DOCX
- [x] 3.4 Add `POST /api/profile/upload-cv` endpoint — validates type, scans, extracts, validates CV, saves cv_text

## 4. Frontend — HTML

- [x] 4.1 Replace CV textarea and Save button in `#cvAnalysisSection` with upload zone, status bar, file-info bar, error card

## 5. Frontend — CSS

- [x] 5.1 Add upload zone styles: `.upload-zone`, `.upload-file-input`, `.upload-zone-inner`, `.upload-icon`, `.upload-label`, `.upload-format-hint`
- [x] 5.2 Add upload state styles: `.upload-status`, `.upload-spinner`, `@keyframes spin`
- [x] 5.3 Add file-info and error styles: `.upload-file-info`, `.file-doc-icon`, `.file-name`, `.replace-btn`, `.upload-error`, `.upload-error-msg`

## 6. Frontend — JavaScript

- [x] 6.1 Remove old `cvForm` submit handler and cv_text save logic from `app.js`
- [x] 6.2 Update `populateCvForm()` — show upload zone when no cv_text, show file-info bar when cv_text exists
- [x] 6.3 Add `uploadCv(file)` — POST multipart to `/api/profile/upload-cv`, animate steps, handle success/error states
- [x] 6.4 Wire file input `change` event, drag-and-drop on upload zone, "Replace" and "Try another file" buttons

## 8. Scan progress bar

- [x] 8.1 Add progress track + fill elements inside `#cvUploadStatus` in HTML
- [x] 8.2 Add `.upload-progress-track` and `.upload-progress-fill` CSS
- [x] 8.3 Rewrite `uploadCv()` to use XHR (real upload progress) + animated fill during scan phase

## 7. Deploy

- [x] 7.1 User rebuilds and pushes Docker image
- [x] 7.2 Redeploy on VM (`docker compose pull app && docker compose up -d`)
