const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');

const app = express();

// CORS-u hər kəs üçün tam açırıq
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server aktivdir!');
});

// VİDEO MƏLUMATLARINI GƏTİRMƏK
app.get('/info', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib" });

    // yt-dlp-nin yerini tam göstərmək daha yaxşıdır (Docker-də çox vaxt /usr/local/bin/yt-dlp olur)
    const command = `yt-dlp -j --no-check-certificates "${videoUrl}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('yt-dlp xətası:', stderr);
            return res.status(500).json({ error: "Video məlumatları alınmadı", details: stderr });
        }
        try {
            const data = JSON.parse(stdout);
            res.json({
                title: data.title || "Video",
                thumbnail: data.thumbnail || "",
                description: data.description ? data.description.substring(0, 100) : "Açıqlama yoxdur"
            });
        } catch (e) {
            res.status(500).json({ error: "JSON oxunarkən xəta" });
        }
    });
});

// VİDEONU YÜKLƏMƏK
app.get('/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("Link lazımdır");

    // Safari və mobil üçün məcburi yükləmə başlıqları
    res.setHeader('Content-Disposition', 'attachment; filename="video_by_parvan.mp4"');
    res.setHeader('Content-Type', 'application/octet-stream');

    const ytDlp = spawn('yt-dlp', [
        '-f', 'bestvideo+bestaudio/best',
        '--no-check-certificates',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-o', '-', 
        videoUrl
    ]);

    ytDlp.stdout.pipe(res);

    ytDlp.stderr.on('data', (data) => console.log(`yt-dlp log: ${data}`));
    
    ytDlp.on('close', (code) => {
        if (code !== 0) console.error(`Proses bitdi, kod: ${code}`);
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Backend ${PORT} portunda işləyir`));
