// server.js (Yenilənmiş versiya - Mobil Yükləmələr üçün daha optimal)

require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec, spawn } = require('child_process');
const rateLimit = require('express-rate-limit');
const axios = require('axios'); 

const app = express();

app.use(express.static(__dirname)); 

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: { error: "Çox sayda sorğu göndərmisiniz, zəhmət olmasa bir az gözləyin." }
});
app.use(limiter);

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'https://tt-instavideoindirme.free.nf'; 
const allowedOrigins = [
    frontendOrigin,
    'http://localhost:5500', 
    'http://127.0.0.1:5500', 
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Bu domenə icazə verilmir (Not allowed by CORS)'));
        }
    },
    methods: ['GET'], 
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

const TIKTOK_RAPIDAPI_HOST = 'tiktok-download-video1.p.rapidapi.com';
const INSTAGRAM_REELS_RAPIDAPI_HOST = 'instagram-reels-downloader-api.p.rapidapi.com';

app.get('/', (req, res) => {
    res.send('Video Downloader Server aktivdir! Yükləmək üçün /info və ya /download-video endpointlərindən istifadə edin.');
});

function getPlatform(url) {
    if (url.includes('tiktok.com')) {
        return 'tiktok';
    }
    if (url.includes('instagram.com/reel')) {
        return 'instagram_reel';
    }
    return 'other'; 
}

// Video məlumatlarını (və birbaşa yükləmə linkini) gətirən endpoint
app.get('/info', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ error: "URL lazımdır." });
    }

    const platform = getPlatform(videoUrl);
    let title = 'Başlıq Tapılmadı';
    let thumbnail = '';
    let directDownloadUrl = null; // Yeni əlavə olundu

    // RapidAPI açarı varsa və platforma dəstəklənirsə, RapidAPI-dən məlumatları al
    if (RAPIDAPI_KEY && (platform === 'tiktok' || platform === 'instagram_reel')) {
        try {
            let options = {};
            if (platform === 'tiktok') {
                options = {
                    method: 'GET',
                    url: `https://${TIKTOK_RAPIDAPI_HOST}/getTiktokVideoInfo`, 
                    params: { url: videoUrl },
                    headers: {
                        'x-rapidapi-key': RAPIDAPI_KEY,
                        'x-rapidapi-host': TIKTOK_RAPIDAPI_HOST
                    }
                };
                const response = await axios.request(options);
                const rapidApiData = response.data;
                
                // TikTok API cavab strukturunu BURADA DƏQİQLƏŞDİRİN
                title = rapidApiData.data?.title || 'TikTok Video Başlığı Tapılmadı';
                thumbnail = rapidApiData.data?.thumbnail_url || '';
                directDownloadUrl = rapidApiData.data?.download_url || null; // Birbaşa linki götür

            } else if (platform === 'instagram_reel') {
                options = {
                    method: 'GET',
                    url: `https://${INSTAGRAM_REELS_RAPIDAPI_HOST}/download`, 
                    params: { url: videoUrl },
                    headers: {
                        'x-rapidapi-key': RAPIDAPI_KEY,
                        'x-rapidapi-host': INSTAGRAM_REELS_RAPIDAPI_HOST
                    }
                };
                const response = await axios.request(options);
                const rapidApiData = response.data;
                
                // Instagram Reels API cavab strukturunu BURADA DƏQİQLƏŞDİRİN
                title = rapidApiData.title || 'Instagram Reel Başlığı Tapılmadı'; 
                thumbnail = rapidApiData.thumbnail_url || ''; 
                directDownloadUrl = rapidApiData.download_url || rapidApiData.video_url || null; // Birbaşa linki götür
            }
            // RapidAPI-dən məlumatlar uğurlu gəlibsə, cavabı göndər
            return res.json({ title, thumbnail, directDownloadUrl });

        } catch (rapidApiError) {
            console.warn(`RapidAPI for ${platform} failed: ${rapidApiError.message}. Falling back to yt-dlp for info.`);
            // RapidAPI uğursuz olarsa, yt-dlp-yə keçirik, amma directDownloadUrl null qalacaq
        }
    }

    // Əgər RapidAPI istifadə olunmayıbsa və ya uğursuz olubsa, yt-dlp-dən istifadə et
    const command = `yt-dlp -j --no-check-certificates "${videoUrl}"`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`yt-dlp info error: ${stderr}`);
            if (stderr.includes('Unsupported URL')) {
                return res.status(400).json({ error: "Dəstəklənməyən video URL-i." });
            }
            if (stderr.includes('Private video') || stderr.includes('This video is unavailable')) {
                return res.status(403).json({ error: "Video tapılmadı və ya özəldir." });
            }
            return res.status(500).json({ error: "Video məlumatları gətirilərkən xəta baş verdi." });
        }

        try {
            const videoInfo = JSON.parse(stdout);
            title = videoInfo.title;
            thumbnail = videoInfo.thumbnail || (videoInfo.thumbnails && videoInfo.thumbnails.length > 0 ? videoInfo.thumbnails[0].url : '');
            // yt-dlp birbaşa yükləmə linki vermir, stream edir, ona görə null qalır
            res.json({ title, thumbnail, directDownloadUrl: null }); 
        } catch (parseError) {
            console.error(`yt-dlp JSON parse error: ${parseError.message}`);
            return res.status(500).json({ error: "Video məlumatları işlənərkən xəta baş verdi." });
        }
    });
});

// Videonu yalnız yt-dlp vasitəsilə stream etmək endpointi
app.get('/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ error: "URL lazımdır." });
    }

    // Əvvəlcə video məlumatlarını alırıq ki, fayl adını təyin edə bilək
    const infoCommand = `yt-dlp -j --no-check-certificates "${videoUrl}"`;
    exec(infoCommand, (infoError, infoStdout, infoStderr) => {
        if (infoError) {
            console.error(`yt-dlp download-info error: ${infoStderr}`);
            if (!res.headersSent) {
                return res.status(500).json({ error: "Video yükləmə məlumatları alınarkən xəta baş verdi." });
            }
            return;
        }

        let filename = "video.mp4";
        try {
            const videoInfo = JSON.parse(infoStdout);
            // Fayl adını URL-kodlaşdırın ki, boşluqlar və xüsusi simvallar problem yaratmasın
            filename = encodeURIComponent(videoInfo.title) + '.' + (videoInfo.ext || 'mp4');
        } catch (parseError) {
            console.warn(`Filename parse error from yt-dlp, using default: ${parseError.message}`);
        }

        // --- DEYİşİKLİK BURADA: Content-Type application/octet-stream OLDU ---
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream'); // video/mp4 yerinə daha ümumi tip
                                                                  // Brauzeri faylı oynatmaq əvəzinə yükləməyə məcbur edir

        const ytDlp = spawn('yt-dlp', [
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', 
            '--merge-output-format', 'mp4', 
            '--no-check-certificates', 
            '-o', '-', 
            videoUrl
        ]);

        ytDlp.stdout.pipe(res); 

        ytDlp.stderr.on('data', (data) => {
            console.error(`yt-dlp stderr: ${data}`);
        });

        ytDlp.on('close', (code) => {
            if (code !== 0) {
                console.error(`yt-dlp prosesi ${code} kodu ilə sona çatdı.`);
                if (!res.headersSent) {
                    res.status(500).json({ error: "Video yüklənərkən xəta baş verdi." });
                }
            } else {
                console.log('Video uğurla stream edildi.');
            }
        });

        ytDlp.on('error', (err) => {
            console.error('Failed to start yt-dlp process.', err);
            if (!res.headersSent) {
                res.status(500).json({ error: "Serverdə daxili xəta baş verdi." });
            }
        });
    });
});


app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT}-da işləyir`));

