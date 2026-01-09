# Plain Language & Inclusive Communication (SCORM)

Custom accessibility enhancements and content injections for the Rise-based SCORM package **Plain Language & Inclusive Communication in the Workplace**.

## Highlights

- Floating accessibility assistant with contrast, large text, spacing, dyslexia-friendly fonts, focus highlights, and image-hiding controls.
- Key Principles infographic injection that persists between the "Key Principles" and "Using Short Sentences" lesson sections.
- Storage-backed state so learners keep their preferences while navigating lessons or reloading.
- Ready for static hosting (GitHub/Vercel) while remaining SCORM-compliant for LMS delivery.

## Local development

```bash
# Serve the course locally
cd scormcontent
python3 -m http.server 8080
```

Then open <http://localhost:8080> in a desktop browser. Toggle the accessibility panel to verify the large-text levels, spacing, and other options.

## Deploying to GitHub

1. Initialize the repository (already done here):
   ```bash
   git init
   git add .
   git commit -m "feat: accessibility + deployment setup"
   ```
2. Create a new empty repository on GitHub.
3. Add it as a remote and push:
   ```bash
   git remote add origin git@github.com:<you>/<repo>.git
   git push -u origin main
   ```

## Deploying to Vercel

1. Install the Vercel CLI (`npm i -g vercel`) and log in once (`vercel login`).
2. From the project root run `vercel` (for the preview) and `vercel --prod` to promote.
3. The included `vercel.json` sets `scormcontent/` as the output directory so the packaged course serves from the root URL.

## Accessibility regression checklist

- **Large Text:** Level 1 = ~10% bump, Level 2 = ~24% bump; headings retain their proportional scale.
- **Spacing:** Apply spacing levels individually without fighting large-text sizing.
- **Dyslexia Font:** Works independently and in combination with large-text/spacing.
- **Images toggle:** Hides Rise `<img>` blocks while preserving infographic injection.
- **Infographic:** Exactly one instance between "Key Principles" and "Using Short Sentences" even on hash-route navigation.

## Next steps

- Execute manual QA across Rise sections after each deployment (Rise virtualizes DOM, so smoke-test both top and bottom of the lesson).
- When hosting statically, disable LMS calls by launching from `scormcontent/index.html` or mock the LMS API.
