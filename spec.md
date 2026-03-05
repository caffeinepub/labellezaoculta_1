# Labellezaoculta

## Current State
- Full photo gallery app with backend (blob-storage + authorization)
- Admin panel with Albums tab and Photos tab
- Photos tab has a single-photo upload dialog (PhotoFormDialog) with file picker, title, description, album selector
- Upload uses StorageClient.putFile with progress bar
- Gallery shows photos with real image URLs from blob storage
- Demo photos show placeholder images/gradients
- No multi-photo upload support

## Requested Changes (Diff)

### Add
- Multi-photo upload: allow selecting multiple files at once
- Drag-and-drop zone in the upload area (dropzone)
- Image preview thumbnails before submitting
- Per-photo title/description fields when uploading multiple
- Upload queue with individual progress indicators

### Modify
- PhotoFormDialog: replace single file picker with multi-file drag-and-drop zone
- Show thumbnail previews of selected images before upload
- Album selector applies to all photos in a batch upload

### Remove
- Nothing removed

## Implementation Plan
1. Create a new MultiPhotoUploadDialog component in AdminPanel.tsx
2. Replace the existing single-file PhotoFormDialog upload flow with the new multi-upload component
3. Show image previews with thumbnails after file selection
4. Upload photos sequentially with per-photo progress
5. Allow editing title/description per photo in the queue
6. Keep the existing edit-photo flow (single photo edit) unchanged
