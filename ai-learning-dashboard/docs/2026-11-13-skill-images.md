# Individual 3D skill artwork

Create 44 separate transparent images for the 43 skill entries and the Prompt Motion collection. Use a different object metaphor for every entry, with glossy resin, frosted acrylic, rounded edges, cobalt, coral, amber, violet and ivory. Retain the book layout, navigation and existing content.

Files: `public/assets/skills/<skill-id>.png` (512px upload image) and `.webp` (256px app image). `public/skill-images.js` maps known IDs to these files and supplies accessible decorative picture elements. Library cards, detail headers, homepage popups and homepage book textures share the mapping. Existing line symbols remain as fallbacks. Serve the new paths through the existing local server and cache library artwork for offline use.

Deliver the catalogue, manifest, generation prompt set and a ZIP containing all artwork. Validate distinct content, alpha channels, HTTP content types, every rendered skill, homepage texture loading, phone layout, existing tests and the static build.
