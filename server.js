const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec, spawn } = require('child_process');
const rateLimit = require('express-rate-limit');

const app = express();

// --- BU SƏTİR ÇOX VACİBDİR ---
// Bu sətir brauzerə icazə verir ki, qovluqdakı .css və .js fayllarını oxuya bilsin
app.use(express.static(__dirname)); 

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Çox sayda sorğu." }
});
app.use(limiter);
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server aktivdir!');
});

app.get('/info', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL lazımdır" });
    const command = `yt-dlp -j --no-check-certificates "${videoUrl}"`;
    exec(command, (error, stdout) => {
        if (error) return res.status(500).json({ error: "Tapılmadı" });
        res.json(JSON.parse(stdout));
    });
});

app.get('/download-video', (req, res) => {
    const videoUrl = req.query.url;
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    res.setHeader('Content-Type', 'video/mp4');
    const ytDlp = spawn('yt-dlp', ['-f', 'best', '--no-check-certificates', '-o', '-', videoUrl]);
    ytDlp.stdout.pipe(res);
});

// --- 404 BURADA OLMALIDIR ---
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT}-da işləyir`));
