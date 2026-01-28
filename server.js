const express = require('express');
const cors = require('cors');
const path = require('path'); // Bu sətir vacibdir!
const { exec, spawn } = require('child_process');
const rateLimit = require('express-rate-limit');

const app = express(); // ƏVƏZİNDƏ BURADA YARANIR

// 1. QORUNMA
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: "Çox sayda sorğu göndərildi." }
});
app.use(limiter);
app.use(cors());
app.use(express.json());

// 2. ANA SƏHİFƏ
app.get('/', (req, res) => {
    res.send('Server aktivdir!');
});

// 3. VİDEO MƏLUMATLARINI GƏTİRMƏK
app.get('/info', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "Link daxil edilməyib" });

    const command = `yt-dlp -j --no-check-certificates "${videoUrl}"`;
    exec(command, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: "Video tapılmadı" });
        try {
            const data = JSON.parse(stdout);
            res.json({
                title: data.title || "Video",
                thumbnail: data.thumbnail || "",
                description: data.description ? data.description.substring(0, 50) : ""
            });
        } catch (e) {
            res.status(500).json({ error: "Məlumat xətası" });
        }
    });
});

// 4. VİDEO YÜKLƏMƏK
app.get('/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("Link daxil edilməyib");

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

// 5. 404 XƏTA SƏHİFƏSİ (MÜTLƏQ AXIRDA OLMALIDIR)
// Əgər yuxarıdakı linklərdən heç biri tutmasa, bura işə düşəcək
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// 6. SERVERİ BAŞLATMAQ
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
