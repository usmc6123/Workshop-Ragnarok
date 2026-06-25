# Workshop: Ragnarök — Self-Hosted Homelab Stack

This is the unified, self-hosted deployment configuration for **Workshop: Ragnarök**, your car service manual library. This stack runs entirely inside Docker on your homelab server (**Roscoe**) without requiring Vercel or Firebase.

---

## 🛠️ Architecture

1. **Frontend + Backend (ragnarok-backend)**:
   - A single-container service running on **port 4000**.
   - Built via a multi-stage Dockerfile that compiles the React application first, copies the static production build into `/public`, and serves it via an Express server.
   - Includes a high-speed SQLite database engine (`workshop.db`) representing indexed vehicle datasets.
2. **Manual Server (lemon-server)**:
   - Serves actual HTML manual content on the local network.
   - Fully isolated inside the Docker network (no exposed external ports required).

---

## ⚙️ Deployment with Docker Compose

To deploy the entire stack on Roscoe, run the following from the project root directory:

```bash
docker compose up -d --build
```

### Complete `docker-compose.yml` Configuration:

```yaml
version: '3.8'

services:
  # The HTML Content Server
  lemon-server:
    build:
      context: ./lemon-server
    container_name: lemon-server
    restart: unless-stopped
    volumes:
      # Mount the actual physical location of your manuals in Read-Only mode
      - /mnt/m/e9dfaf202d2b8b99988d2e87517b7a90eb73ad92/lemon-manuals:/data:ro

  # Workshop: Ragnarök API & Static Web Server
  workshop-backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    container_name: ragnarok-backend
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
      - LEMON_SERVER_URL=http://lemon-server:8080
      - DB_PATH=/data/db/workshop.db
    volumes:
      # Persistent storage path on Roscoe for SQLite DB and the index.json for ingestion
      - /mnt/d/HomeServer/workshop-ragnarok/data:/data
    depends_on:
      - lemon-server
```

---

## ⚡ SQLite Database Hydration

The backend includes a high-performance database ingestion pipeline that reads your CHARM index and populates the SQLite tables with multi-column indexes for search speeds.

Once the container is running, execute the following command to hydrate your index:

```bash
docker exec -it ragnarok-backend npm run ingest
```

### Script behavior:
1. Verifies `/data/charm/index.json` is present.
2. Connects to `/data/db/workshop.db` and ensures the schemas (`vehicles` and `garage` tables) exist.
3. Runs a high-performance transaction to insert over 100,000+ records in seconds.
4. Adds indices to speed up search queries on `make` and `year`.

---

## 📡 Exposed Endpoints

* **Frontend Page / Navigation**: `GET /` — Serves the compiled React app. Any non-API route serves `/public/index.html` to support React client-side Router paths.
* **Makes**: `GET /api/makes` — Returns a sorted, unique list of vehicle makes.
* **Years**: `GET /api/years?make=Ford` — Returns years for that make.
* **Vehicles Search**: `GET /api/vehicles?make=Ford&year=2006&q=Explorer` — Returns searched vehicle rows.
* **Garage Log Bookmarks**:
  * `GET /api/garage` — Lists saved garage vehicles with their joined indexes.
  * `POST /api/garage` — Bookmark a vehicle (`{ vehicleId, nickname }`).
  * `DELETE /api/garage/:garageId` — Remove a bookmarked vehicle.
* **Manual Parsing**: `GET /api/page?uri=/Ford/2006/...` — Pulls HTML from `lemon-server`, processes elements with `cheerio`, and returns structured JSON blocks (headings, ordered procedures, paragraphs, etc.).
* **Graphics Proxy**: `GET /api/image?src=/some/image.png` — Proxies graphic assets from `lemon-server` with their original Content-Type headers.
