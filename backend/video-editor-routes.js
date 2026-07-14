const express = require('express');
const router = express.Router();
const db = require('./db');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile, spawn } = require('child_process');

const RESOLUTION_PRESETS = {
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 }
};

// In-memory job queue for video renders (similar to compress-video jobs)
const renderJobs = new Map();

function scheduleRenderJobCleanup(jobId, delayMs = 10 * 60 * 1000) {
  setTimeout(() => renderJobs.delete(jobId), delayMs).unref();
}

function probeDurationSeconds(inputPath) {
  return new Promise((resolve, reject) => {
    execFile('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ], (error, stdout) => {
      if (error) return reject(error);
      const seconds = parseFloat(stdout);
      if (!seconds || Number.isNaN(seconds)) return reject(new Error("Could not read the video's duration."));
      resolve(seconds);
    });
  });
}

// 1. GET /api/video-projects - list current user's projects
router.get('/', (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM video_projects WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching video projects:', error);
    res.status(500).json({ error: 'Database error fetching video projects' });
  }
});

// 2. POST /api/video-projects - create a new project
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    const initialTimeline = JSON.stringify({
      clips: [],
      overlays: [],
      background_music: { source_url: null, volume: 40 },
      output: { resolution: '720p' }
    });
    const info = db.prepare(`
      INSERT INTO video_projects (user_id, name, timeline, status, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', datetime('now'), datetime('now'))
    `).run(req.user.id, name || 'Untitled Project', initialTimeline);

    const created = db.prepare('SELECT * FROM video_projects WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id);
    res.json(created);
  } catch (error) {
    console.error('Error creating video project:', error);
    res.status(500).json({ error: 'Database error creating video project' });
  }
});

// 3. GET /api/video-projects/:id - fetch one project
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const project = db.prepare('SELECT * FROM video_projects WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!project) return res.status(404).json({ error: 'Video project not found' });
    res.json(project);
  } catch (error) {
    console.error('Error fetching video project:', error);
    res.status(500).json({ error: 'Database error fetching video project' });
  }
});

// 4. PUT /api/video-projects/:id - save the timeline JSON
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, timeline, status, output_url, thumbnail_url } = req.body;
    const project = db.prepare('SELECT * FROM video_projects WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!project) return res.status(404).json({ error: 'Video project not found' });

    const finalName = name !== undefined ? name : project.name;
    const finalTimeline = timeline !== undefined ? (typeof timeline === 'string' ? timeline : JSON.stringify(timeline)) : project.timeline;
    const finalStatus = status !== undefined ? status : project.status;
    const finalOutputUrl = output_url !== undefined ? output_url : project.output_url;
    const finalThumbnailUrl = thumbnail_url !== undefined ? thumbnail_url : project.thumbnail_url;

    db.prepare(`
      UPDATE video_projects
      SET name = ?, timeline = ?, status = ?, output_url = ?, thumbnail_url = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(finalName, finalTimeline, finalStatus, finalOutputUrl, finalThumbnailUrl, id, req.user.id);

    const updated = db.prepare('SELECT * FROM video_projects WHERE id = ? AND user_id = ?').get(id, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating video project:', error);
    res.status(500).json({ error: 'Database error updating video project' });
  }
});

// 5. DELETE /api/video-projects/:id - delete a project
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const project = db.prepare('SELECT * FROM video_projects WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!project) return res.status(404).json({ error: 'Video project not found' });

    if (project.output_url) {
      const filename = path.basename(project.output_url);
      const dbDir = path.dirname(process.env.DB_PATH || '/data/db/workshop.db');
      const UPLOADS_ROOT = path.join(path.dirname(dbDir), 'uploads');
      const filePath = path.join(UPLOADS_ROOT, 'media', filename);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.error('Error deleting project output file:', e);
      }
    }

    db.prepare('DELETE FROM video_projects WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting video project:', error);
    res.status(500).json({ error: 'Database error deleting video project' });
  }
});

// 6. POST /api/video-projects/:id/render - kicks off the actual render
router.post('/:id/render', async (req, res) => {
  try {
    const { id } = req.params;
    const project = db.prepare('SELECT * FROM video_projects WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!project) return res.status(404).json({ error: 'Video project not found' });

    const timeline = typeof project.timeline === 'string' ? JSON.parse(project.timeline) : (project.timeline || {});
    const clips = timeline.clips || [];

    if (clips.length === 0) {
      return res.status(400).json({ error: 'Cannot render project with no clips.' });
    }

    const outputPreset = (timeline.output && timeline.output.resolution) || '720p';
    const preset = RESOLUTION_PRESETS[outputPreset] || RESOLUTION_PRESETS['720p'];
    const { width, height } = preset;

    const dbDir = path.dirname(process.env.DB_PATH || '/data/db/workshop.db');
    const UPLOADS_ROOT = path.join(path.dirname(dbDir), 'uploads');

    // 1. Resolve duration for all clips up front via ffprobe
    let totalDuration = 0;
    const clipInfos = [];
    for (const clip of clips) {
      let localPath = '';
      if (clip.source_url.startsWith('/uploads/')) {
        localPath = path.join(UPLOADS_ROOT, clip.source_url.slice('/uploads/'.length));
      } else {
        const basename = path.basename(clip.source_url);
        localPath = path.join(UPLOADS_ROOT, 'media', basename);
        if (!fs.existsSync(localPath)) {
          localPath = path.join(UPLOADS_ROOT, basename);
        }
      }

      let durationSec = 0;
      try {
        durationSec = await probeDurationSeconds(localPath);
      } catch (e) {
        console.error(`Probing failed for clip ${clip.source_url}:`, e);
      }

      const start = typeof clip.trim_start === 'number' ? clip.trim_start : 0;
      const end = (typeof clip.trim_end === 'number' && clip.trim_end > start) ? clip.trim_end : durationSec;
      const clipDur = Math.max(0, end - start);
      totalDuration += clipDur;

      clipInfos.push({
        ...clip,
        localPath,
        start,
        end,
        clipDur,
        totalDur: durationSec
      });
    }

    if (totalDuration === 0) {
      return res.status(400).json({ error: 'Total duration is 0, cannot render.' });
    }

    const jobId = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const tempOutputPath = path.join(os.tmpdir(), `render_out_${jobId}.mp4`);

    renderJobs.set(jobId, { status: 'processing', percent: 0 });
    res.json({ jobId }); // Respond immediately to client

    // Run the ffmpeg process in the background
    (async () => {
      try {
        const args = ['-y'];

        // Add clip inputs
        clipInfos.forEach(info => {
          args.push('-i', info.localPath);
        });

        // Add background music if set
        const bgMusic = timeline.background_music;
        let bgMusicInputIndex = -1;
        if (bgMusic && bgMusic.source_url) {
          let musicLocalPath = '';
          if (bgMusic.source_url.startsWith('/uploads/')) {
            musicLocalPath = path.join(UPLOADS_ROOT, bgMusic.source_url.slice('/uploads/'.length));
          } else {
            const basename = path.basename(bgMusic.source_url);
            musicLocalPath = path.join(UPLOADS_ROOT, 'media', basename);
            if (!fs.existsSync(musicLocalPath)) {
              musicLocalPath = path.join(UPLOADS_ROOT, basename);
            }
          }
          if (fs.existsSync(musicLocalPath)) {
            bgMusicInputIndex = clipInfos.length;
            args.push('-stream_loop', '-1', '-i', musicLocalPath);
          }
        }

        // Add image overlays if set
        const overlays = timeline.overlays || [];
        const imageOverlays = overlays.filter(o => o.type === 'image' && o.image_url);
        const imageOverlayInputStartIndex = (bgMusicInputIndex !== -1) ? bgMusicInputIndex + 1 : clipInfos.length;

        imageOverlays.forEach((ov, idx) => {
          let imgLocalPath = '';
          if (ov.image_url.startsWith('/uploads/')) {
            imgLocalPath = path.join(UPLOADS_ROOT, ov.image_url.slice('/uploads/'.length));
          } else {
            const basename = path.basename(ov.image_url);
            imgLocalPath = path.join(UPLOADS_ROOT, 'media', basename);
            if (!fs.existsSync(imgLocalPath)) {
              imgLocalPath = path.join(UPLOADS_ROOT, basename);
            }
          }
          if (!fs.existsSync(imgLocalPath)) {
            const pubPath = path.join(process.cwd(), 'public', ov.image_url.replace(/^\//, ''));
            if (fs.existsSync(pubPath)) {
              imgLocalPath = pubPath;
            }
          }
          args.push('-i', imgLocalPath);
          ov.inputIndex = imageOverlayInputStartIndex + idx;
        });

        // Build filter_complex
        const filterComplexParts = [];

        // 1. Clip Trimming & Scaling
        clipInfos.forEach((info, idx) => {
          filterComplexParts.push(`[${idx}:v]trim=start=${info.start}:end=${info.end},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:-1:-1,setsar=1,fps=30[v${idx}]`);
          filterComplexParts.push(`[${idx}:a]atrim=start=${info.start}:end=${info.end},asetpts=PTS-STARTPTS,volume=${info.volume / 100}[a${idx}]`);
        });

        // 2. Concatenation of Clips
        const concatInputs = clipInfos.map((_, idx) => `[v${idx}][a${idx}]`).join('');
        filterComplexParts.push(`${concatInputs}concat=n=${clipInfos.length}:v=1:a=1[v_concat][a_concat]`);

        // 3. Scale Image Overlays
        imageOverlays.forEach((ov, idx) => {
          const targetW = Math.round(width * (ov.w || 20) / 100);
          const targetH = Math.round(height * (ov.h || 20) / 100);
          filterComplexParts.push(`[${ov.inputIndex}:v]scale=${targetW}:${targetH}[ov_img_${idx}]`);
        });

        // 4. Apply Overlays sequentially
        let currentVideoStream = '[v_concat]';
        let videoStreamIndex = 0;
        overlays.forEach((ov) => {
          const nextVideoStream = `[v_ov_${videoStreamIndex + 1}]`;
          if (ov.type === 'text') {
            const escapedText = String(ov.text || '').replace(/'/g, "'\\''").replace(/:/g, '\\:');
            const color = ov.color || '#ffffff';
            const size = ov.font_size || 24;
            const xExpr = `w*${ov.x || 10}/100`;
            const yExpr = `h*${ov.y || 10}/100`;
            const tStart = ov.start_time || 0;
            const tEnd = ov.end_time || 5;
            filterComplexParts.push(`${currentVideoStream}drawtext=text='${escapedText}':fontcolor=${color}:fontsize=${size}:x=${xExpr}:y=${yExpr}:enable='between(t,${tStart},${tEnd})'${nextVideoStream}`);
            currentVideoStream = nextVideoStream;
            videoStreamIndex++;
          } else if (ov.type === 'image' && ov.image_url) {
            const imgIdx = imageOverlays.indexOf(ov);
            if (imgIdx !== -1) {
              const xExpr = `W*${ov.x || 10}/100`;
              const yExpr = `H*${ov.y || 10}/100`;
              const tStart = ov.start_time || 0;
              const tEnd = ov.end_time || 5;
              filterComplexParts.push(`${currentVideoStream}[ov_img_${imgIdx}]overlay=x=${xExpr}:y=${yExpr}:enable='between(t,${tStart},${tEnd})'${nextVideoStream}`);
              currentVideoStream = nextVideoStream;
              videoStreamIndex++;
            }
          }
        });

        // 5. Audio Mixing
        let currentAudioStream = '[a_concat]';
        if (bgMusicInputIndex !== -1) {
          filterComplexParts.push(`[${bgMusicInputIndex}:a]volume=${(bgMusic.volume || 40) / 100}[bg_music_vol]`);
          filterComplexParts.push(`[a_concat][bg_music_vol]amix=inputs=2:duration=first:dropout_transition=0[a_mixed]`);
          currentAudioStream = '[a_mixed]';
        }

        args.push(
          '-filter_complex', filterComplexParts.join(';'),
          '-map', currentVideoStream,
          '-map', currentAudioStream,
          '-c:v', 'libx264',
          '-crf', '23',
          '-preset', 'veryfast',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          '-progress', 'pipe:1',
          '-nostats',
          tempOutputPath
        );

        const durationMs = totalDuration * 1000;
        const encodeTimeoutMs = Math.min(
          90 * 60 * 1000,
          Math.max(15 * 60 * 1000, durationMs * 4)
        );

        await new Promise((resolve, reject) => {
          const proc = spawn('ffmpeg', args);

          let stderrTail = '';
          proc.stderr.on('data', (chunk) => {
            stderrTail = (stderrTail + chunk.toString()).slice(-4000);
          });

          let buffer = '';
          proc.stdout.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const eq = line.indexOf('=');
              if (eq === -1) continue;
              const key = line.slice(0, eq).trim();
              const value = line.slice(eq + 1).trim();
              if (key === 'out_time_us') {
                const outMs = parseInt(value, 10) / 1000;
                const percent = Math.max(0, Math.min(99, Math.round((outMs / durationMs) * 100)));
                const job = renderJobs.get(jobId);
                if (job) renderJobs.set(jobId, { ...job, percent });
              }
            }
          });

          const timeoutHandle = setTimeout(() => {
            proc.kill('SIGKILL');
            reject(new Error('Render timed out.'));
          }, encodeTimeoutMs);

          proc.on('error', (error) => {
            clearTimeout(timeoutHandle);
            reject(error);
          });
          proc.on('close', (code) => {
            clearTimeout(timeoutHandle);
            if (code !== 0) {
              console.error('ffmpeg render failed:', stderrTail);
              return reject(new Error('Video render failed — ffmpeg process exited with code ' + code));
            }
            resolve();
          });
        });

        const mediaDir = path.join(UPLOADS_ROOT, 'media');
        if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
        const finalFilename = `render_${id}_${jobId}.mp4`;
        const fullPath = path.join(mediaDir, finalFilename);
        fs.copyFileSync(tempOutputPath, fullPath);

        const outputUrl = `/uploads/media/${finalFilename}`;

        // Get a thumbnail (first frame of first video) if possible or just use output url or a default
        db.prepare(`
          UPDATE video_projects
          SET status = 'rendered', output_url = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(outputUrl, id);

        renderJobs.set(jobId, {
          status: 'done',
          percent: 100,
          url: outputUrl,
        });
      } catch (error) {
        console.error('Error in video render job:', error);
        db.prepare(`
          UPDATE video_projects
          SET status = 'error', updated_at = datetime('now')
          WHERE id = ?
        `).run(id);
        renderJobs.set(jobId, {
          status: 'error',
          percent: 0,
          error: error.message || 'Render failed'
        });
      } finally {
        try { if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath); } catch (e) {}
        scheduleRenderJobCleanup(jobId);
      }
    })();
  } catch (error) {
    console.error('Error starting video render:', error);
    res.status(500).json({ error: 'Database error starting video render' });
  }
});

// 7. GET /api/video-projects/:id/render/:jobId - poll render progress
router.get('/:id/render/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = renderJobs.get(jobId);
  if (!job) return res.status(404).json({ error: 'Render job not found or expired' });
  res.json(job);
});

module.exports = router;
module.exports.renderJobs = renderJobs;
