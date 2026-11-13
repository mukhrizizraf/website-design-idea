# Skill images

Each skill has its own illustrated 3D object, generated individually with the built-in image generation tool.

- `<skill-id>.png`: 512 × 512, transparent, for uploading into another app.
- `<skill-id>.webp`: 256 × 256, transparent, the smaller image used by this dashboard.
- `index.html`: visual catalogue with individual download links. Open it directly from your drive.
- `contact-sheet.png`: overview of the entire collection.
- `manifest.json`: skill names, IDs, filenames, dimensions and file hashes.
- `prompts.json`: the generation prompt for each image.

The app uses `public/skill-images.js` for matching skill IDs to files. Homepage books, homepage skill popups, library cards and detail sheets share this artwork. `public/skill-images-home.js` embeds the nine homepage pictures so its canvas can display them when the app opens directly from disk.

For another app, upload the PNG files and match them using `id` in the manifest. The ZIP at the project root contains this folder under `assets/skills/`.

These are rendered 3D-style images, supplied as PNG and WebP files.
