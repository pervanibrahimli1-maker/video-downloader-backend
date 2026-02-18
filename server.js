// server.js (Yenilənmiş versiya - yt-dlp + RapidAPI)

require('dotenv').config(); // .env faylındakı dəyişənləri yükləyin
const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec, spawn } = require('child_process');
const rateLimit = require('express-rate-limit');
const axios = require('axios'); // RapidAPI sorğuları üçün əlavə edildi

const app = express();

// --- BU SƏTİR ÇOX VACİBDİR ---
// Bu sətir brauzerə icazə verir ki, qovluqdakı .css və .js fayllarını oxuya bilsin
// Əgər frontendiniz ayrı hostda (məsələn, InfinityFree) yerləşirsə, bu sətirə ehtiyac qalmır.
// Amma ehtiyat üçün saxlaya bilərsiniz.
app.use(express.static(__dirname)); 

// Sorğu limitləməsi (Rate Limiting)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dəqiqə
    max: 100, // 15 dəqiqədə 100 sorğuya qədər
    message: { error: "Çox sayda sorğu göndərmisiniz, zəhmət olmasa bir az gözləyin." }
});
app.use(limiter);

// CORS ayarları
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'https://tt-instavideoindirme.free.nf'; // Frontend domeninizi buraya əlavə edin!
const allowedOrigins = [
    frontendOrigin,
    'http://localhost:5500', // Frontend test üçün
    'http://127.0.0.1:5500', // Frontend test üçün
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Bu domenə icazə verilmir (Not allowed by CORS)'));
        }
    },
    methods: ['GET'], // Sadəcə GET sorğularına icazə verin
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// RapidAPI Hostları (sizin şəkildəki API-lərdən götürülüb)
const TIKTOK_RAPIDAPI_HOST = 'tiktok-download-video1.p.rapidapi.com';
const INSTAGRAM_REELS_RAPIDAPI_HOST = 'instagram-reels-downloader-api.p.rapidapi.com';

app.get('/', (req, res) => {
    res.send('Video Downloader Server aktivdir! Yükləmək üçün /info və ya /download-video endpointlərindən istifadə edin.');
});

// URL-in hansı platformaya aid olduğunu müəyyən edən köməkçi funksiya
function getPlatform(url) {
    if (url.includes('tiktok.com')) {
        return 'tiktok';
    }
    if (url.includes('instagram.com/reel')) {
        return 'instagram_reel';
    }
    // Gələcəkdə digər platformaları da əlavə edə bilərsiniz
    return 'other'; // Başqa bütün URL-lər üçün 'other' qaytarırıq (yt-dlp istifadə olunacaq)
}

// Video məlumatlarını gətirən endpoint
app.get('/info', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ error: "URL lazımdır." });
    }

    const platform = getPlatform(videoUrl);
    let title = 'Başlıq Tapılmadı';
    let thumbnail = '';
    let usedRapidApi = false;

    // Əgər RapidAPI açarı təyin edilibsə və platforma dəstəklənirsə
    if (RAPIDAPI_KEY && (platform === 'tiktok' || platform === 'instagram_reel')) {
        try {
            let options = {};
            if (platform === 'tiktok') {
                options = {
                    method: 'GET',
                    url: `https://${TIKTOK_RAPIDAPI_HOST}/getTiktokVideoInfo`, // TikTok API endpointi
                    params: { url: videoUrl },
                    headers: {
                        'x-rapidapi-key': RAPIDAPI_KEY,
                        'x-rapidapi-host': TIKTOK_RAPIDAPI_HOST
                    }
                };
                const response = await axios.request(options);
                const rapidApiData = response.data;
                // --- TikTok API cavab strukturunu BURADA DƏQİQLƏŞDİRİN ---
                title = rapidApiData.data?.title || 'TikTok Video Başlığı Tapılmadı';
                thumbnail = rapidApiData.data?.thumbnail_url || '';
                usedRapidApi = true;
            } else if (platform === 'instagram_reel') {
                options = {
                    method: 'GET',
                    url: `https://${INSTAGRAM_REELS_RAPIDAPI_HOST}/download`, // Instagram Reels API endpointi
                    params: { url: videoUrl },
                    headers: {
                        'x-rapidapi-key': RAPIDAPI_KEY,
                        'x-rapidapi-host': INSTAGRAM_REELS_RAPIDAPI_HOST
                    }
                };
                const response = await axios.request(options);
                const rapidApiData = response.data;
                // --- Instagram Reels API cavab strukturunu BURADA DƏQİQLƏŞDİRİN ---
                title = rapidApiData.title || 'Instagram Reel Başlığı Tapılmadı'; // Məsələn, birbaşa kök obyektdə ola bilər
                thumbnail = rapidApiData.thumbnail_url || ''; // Məsələn, birbaşa kök obyektdə ola bilər
                usedRapidApi = true;
            }
        } catch (rapidApiError) {
            console.warn(`RapidAPI for ${platform} failed: ${rapidApiError.message}. Falling back to yt-dlp.`);
            // RapidAPI uğursuz olarsa, yt-dlp-yə keçirik
        }
    }

    // Əgər RapidAPI istifadə olunmayıbsa və ya uğursuz olubsa, yt-dlp-dən istifadə et
    if (!usedRapidApi) {
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
                res.json({ title, thumbnail });
            } catch (parseError) {
                console.error(`yt-dlp JSON parse error: ${parseError.message}`);
                return res.status(500).json({ error: "Video məlumatları işlənərkən xəta baş verdi." });
            }
        });
    } else {
        // RapidAPI uğurlu olubsa, cavabı göndərin
        res.json({ title, thumbnail });
    }
});

// Videonu yükləmək endpointi
app.get('/download-video', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ error: "URL lazımdır." });
    }

    const platform = getPlatform(videoUrl);
    let directDownloadLink = null;
    let usedRapidApiForDownload = false;
    let filename = "video.mp4"; // Varsayılan fayl adı

    // Əgər RapidAPI açarı təyin edilibsə və platforma dəstəklənirsə
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
                // --- TikTok API cavab strukturunu BURADA DƏQİQLƏŞDİRİN ---
                directDownloadLink = rapidApiData.data?.download_url;
                filename = encodeURIComponent(rapidApiData.data?.title || 'tiktok_video') + '.' + (rapidApiData.data?.ext || 'mp4');
                usedRapidApiForDownload = true;
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
                // --- Instagram Reels API cavab strukturunu BURADA DƏQİQLƏŞDİRİN ---
                directDownloadLink = rapidApiData.download_url || rapidApiData.video_url; // API-dən asılı olaraq dəyişir
                filename = encodeURIComponent(rapidApiData.title || 'instagram_reel') + '.' + (rapidApiData.ext || 'mp4');
                usedRapidApiForDownload = true;
            }

            if (directDownloadLink) {
                // Əgər RapidAPI-dən birbaşa yükləmə linki aldıqsa, yönləndiririk
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                return res.redirect(directDownloadLink);
            }
        } catch (rapidApiError) {
            console.warn(`RapidAPI download for ${platform} failed: ${rapidApiError.message}. Falling back to yt-dlp.`);
            // RapidAPI uğursuz olarsa, yt-dlp-yə keçirik
            usedRapidApiForDownload = false; // Yükləmə üçün RapidAPI istifadə edilmədi
        }
    }

    // Əgər RapidAPI istifadə olunmayıbsa və ya uğursuz olubsa, yt-dlp-dən istifadə et
    if (!usedRapidApiForDownload) {
        const infoCommand = `yt-dlp -j --no-check-certificates "${videoUrl}"`;
        exec(infoCommand, (infoError, infoStdout, infoStderr) => {
            if (infoError) {
                console.error(`yt-dlp download-info error: ${infoStderr}`);
                if (!res.headersSent) {
                    return res.status(500).json({ error: "Video yükləmə məlumatları alınarkən xəta baş verdi." });
                }
                return;
            }

            try {
                const videoInfo = JSON.parse(infoStdout);
                filename = encodeURIComponent(videoInfo.title) + '.' + (videoInfo.ext || 'mp4');
            } catch (parseError) {
                console.warn(`Filename parse error from yt-dlp, using default: ${parseError.message}`);
            }

            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'video/mp4'); // Ən yaxşı formatı tapır, lakin adətən mp4 olur.

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
    }
});


// --- 404 BURADA OLMALIDIR ---
app.use((req, res) => {
    // Əgər frontend faylları bu serverdən yox, InfinityFree-dən gəlirsə
    // onda 404.html faylını InfinityFree serverinizdə yerləşdirməlisiniz.
    // Bu kod yalnız frontend də bu serverdə yerləşsə işləyər.
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT}-da işləyir`));
