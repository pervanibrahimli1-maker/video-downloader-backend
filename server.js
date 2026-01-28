const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const rateLimit = require('express-rate-limit');

const app = express();

// 1. QORUNMA: Saytın çökməməsi üçün bir IP-dən gələn sorğuları limitləyirik
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dəqiqə
    max: 25, // Bir adam 15 dəqiqədə maks 50 sorğu göndərə bilər
    message: { error: "Çox sayda sorğu göndərildi, bir az gözləyin." }
});
app.use(limiter);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Video Downloader API is Secure and Running!');
});

// VİDEO MƏLUMATLARINI GƏTİRMƏK
app.get('/info', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "Link daxil edilməyib" });

    const command = `yt-dlp -j --no-check-certificates "${videoUrl}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: "Video tapılmadı və ya keçərsiz link." });
        }
        try {
            const data = JSON.parse(stdout);
            res.json({
                title: data.title || "Video",
                thumbnail: data.thumbnail || "",
                description: data.description ? data.description.substring(0, 50) : "Açıqlama yoxdur"
            });
        } catch (e) {
            res.status(500).json({ error: "Məlumat oxunarkən xəta baş verdi." });
        }
    });
});

// VİDEONU PROXY İLƏ YÜKLƏMƏK (Filiqransız və Səsli)
app.get('/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("Link daxil edilməyib");

    // Safari və Mobil üçün məcburi yükləmə başlıqları
    res.setHeader('Content-Disposition', 'attachment; filename="video_by_parvan.mp4"');
    res.setHeader('Content-Type', 'application/octet-stream');

    // '-f best' həm səs həm görüntünün birlikdə olduğu tək MP4 faylını götürür
    const ytDlp = spawn('yt-dlp', [
        '-f', 'best', 
        '--no-check-certificates',
        '--add-header', 'Referer:https://www.tiktok.com/',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-o', '-', 
        videoUrl
    ]);

    ytDlp.stdout.pipe(res);

    ytDlp.on('close', (code) => {
        if (code !== 0) console.error(`Yükləmə xətası, kod: ${code}`);
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
