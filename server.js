require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const rateLimit = require('express-rate-limit');

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

// 2. Video Məlumatlarını gətirən Endpoint (/info)
app.get('/info', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib." });

    // yt-dlp vasitəsilə bütün JSON məlumatlarını alırıq
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
            console.error("yt-dlp Error:", stderrData);
            return res.status(400).json({ error: "Video məlumatları alınmadı. Linki yoxlayın." });
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
                description: info.description ? info.description.substring(0, 100) + "..." : "Açıqlama yoxdur."
            });
        } catch (err) {
            res.status(500).json({ error: "Məlumat emal edilərkən xəta baş verdi." });
        }
    });
});

// 3. Videonu MP4 (Səs + Görüntü) yükləyən Endpoint (/download-video)
app.get('/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL lazımdır." });

    // Fayl adını təyin etmək üçün qısa bir meta-data alırıq
    const getFileName = spawn('yt-dlp', ['--get-filename', '-o', '%(title)s.%(ext)s', videoUrl]);
    
    let rawFileName = 'video.mp4';
    getFileName.stdout.on('data', (data) => {
        rawFileName = data.toString().trim();
    });

    getFileName.on('close', () => {
        // Təhlükəsiz fayl adı (simvollar təmizlənir)
        const safeFileName = encodeURIComponent(rawFileName.replace(/[/\\?%*:|"<>]/g, '-'));

        // Başlıqlar: Brauzerə bunun bir MP4 faylı olduğunu bildiririk
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
        res.setHeader('Content-Type', 'video/mp4');

        /* 
           ƏSAS HİSSƏ: 
           -f "best[ext=mp4]/best" -> Bu əmr daxilində həm səs, həm görüntü olan 
           hazır MP4 faylını seçir. "bestvideo+bestaudio" istifadə etmirik, 
           çünki o zaman serverdə birləşdirmə (merge) prosesi axını (pipe) pozur.
        */
        const download = spawn('yt-dlp', [
            '-f', 'best[ext=mp4]/best', 
            '--no-check-certificates',
            '-o', '-', 
            videoUrl
        ]);

        download.stdout.pipe(res);

        download.stderr.on('data', (data) => {
            console.error(`Download Stderr: ${data}`);
        });

        download.on('close', (code) => {
            if (code !== 0) {
                console.error(`Yükləmə xətası, kod: ${code}`);
                if (!res.headersSent) res.status(500).send("Yükləmə zamanı xəta.");
            }
        });

        // İstifadəçi yükləməni ləğv edərsə prosesi dayandır
        req.on('close', () => {
            download.kill();
        });
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda işləyir...`));
