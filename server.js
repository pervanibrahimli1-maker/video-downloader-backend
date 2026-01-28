const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// 1. VİDEO MƏLUMATLARINI GƏTİRƏN HİSSƏ (Ad, Şəkil və s.)
app.get('/info', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "Link lazımdır" });

    // yt-dlp ilə JSON formatında məlumatları çəkirik
    const command = `yt-dlp -j --no-playlist --no-check-certificates "${videoUrl}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: "Məlumat tapılmadı", details: stderr });
        }
        try {
            const data = JSON.parse(stdout);
            res.json({
                title: data.title || "Video",
                thumbnail: data.thumbnail || "",
                description: data.description ? data.description.substring(0, 100) + "..." : "",
                duration: data.duration_string || ""
            });
        } catch (e) {
            res.status(500).json({ error: "Məlumatı oxumaq mümkün olmadı" });
        }
    });
});

// 2. VİDEONU PROXY/STREAM EDƏN HİSSƏ (Yükləmə düyməsi üçün)
app.get('/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("Link lazımdır");

    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    res.setHeader('Content-Type', 'video/mp4');

    const ytDlp = spawn('yt-dlp', [
        '-f', 'best',
        '--no-check-certificates',
        '-o', '-', 
        videoUrl
    ]);

    ytDlp.stdout.pipe(res);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
