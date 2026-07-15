<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7d133d72-ece3-4c17-9035-735644df2924

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## Optional: Run Twick Studio container locally

This project includes an optional docker-compose snippet (docker-compose.twick.yml) to run a local Twick Studio production container and proxy it via the backend.

1. Build Twick prod image (from the twick repository) or use an existing image tagged `twick-twick-prod:latest`.
2. Start the Twick container (internal network only):
   `docker compose -f docker-compose.twick.yml up -d`
3. Ensure the backend environment variable TWICK_PROD_URL points to the Twick container (`http://twick-prod:80`) or to your public Cloudflare Tunnel URL.
4. Start backend and frontend as usual:
   - `npm run dev` (frontend)
   - `npm run server` (backend)

Verification

- Open the app, click the left nav "Video Editor"; the page will dynamically import @twick/studio or fall back to the proxied iframe at `/video-editor-proxy`.
- If Twick is running, verify the header reads "Roscoe & Cooper's Studio" and "Upload from device" buttons work for video/image/audio.
