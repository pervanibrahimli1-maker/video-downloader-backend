require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const rateLimit = require('express-rate-limit');
const axios = require('axios'); // 1. BURANI ƏLAVƏ ETDİK

const app = express();

// 1. Təhlükəsizlik və Limitlər
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Çox sayda sorğu göndərilib, bir az gözləyin." }
});
app.use(limiter);

const allowedOrigins = [
    process.env.FRONTEND_ORIGIN || 'https://tt-instavideoindirme.free.nf',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('CORS icazə vermir.'));
        }
    }
}));

app.use(express.json());

// 2. Şəkil Proxy Endpointi (Şəkillərin bloklanmaması üçün) - YENİ ƏLAVƏ
app.get('/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("URL yoxdur");

    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            }
        });
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (e) {
        console.error("Proxy xətası:", e.message);
        res.status(500).send("Şəkil yüklənə bilmədi");
    }
});

// 3. Video Məlumatlarını gətirən Endpoint (/info)
app.get('/info', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib." });

    const ytDlp = spawn('yt-dlp', [
        '--dump-json',
        '--no-check-certificates',
        videoUrl
    ]);

    let stdoutData = '';
    let stderrData = '';

    ytDlp.stdout.on('data', (data) => { stdoutData += data; });
    ytDlp.stderr.on('data', (data) => { stderrData += data; });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            return res.status(400).json({ error: "Video məlumatları alınmadı." });
        }

        try {
            const info = JSON.parse(stdoutData);
            res.json({
                title: info.title || "Başlıq yoxdur",
                thumbnail: info.thumbnail || "",
                uploader: info.uploader || info.channel || info.uploader_id || "Naməlum",
                duration: info.duration_string || "0:00",
                views: info.view_count ? info.view_count.toLocaleString() : "0",
                platform: info.extractor_key || "Video",
                // Açıqlama hissəsi burada (description):
                description: info.description ? info.description.substring(0, 150) + "..." : "Açıqlama yoxdur."
            });
        } catch (err) {
            res.status(500).json({ error: "Məlumat emal xətası." });
        }
    });
});

// 4. Videonu MP4 yükləyən Endpoint (/download-video)
app.get('/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL lazımdır." });

    const getFileName = spawn('yt-dlp', ['--get-filename', '-o', '%(title)s.%(ext)s', videoUrl]);
    
    let rawFileName = 'video.mp4';
    getFileName.stdout.on('data', (data) => { rawFileName = data.toString().trim(); });

    getFileName.on('close', () => {
        const safeFileName = encodeURIComponent(rawFileName.replace(/[/\\?%*:|"<>]/g, '-'));
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
        res.setHeader('Content-Type', 'video/mp4');

        const download = spawn('yt-dlp', [
            '-f', 'best[ext=mp4]/best', 
            '--no-check-certificates',
            '-o', '-', 
            videoUrl
        ]);

        download.stdout.pipe(res);

        req.on('close', () => { download.kill(); });
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
