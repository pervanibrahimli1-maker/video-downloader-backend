const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// 1. CORS VƏ TƏHLÜKƏSİZLİK DÜZƏLİŞİ
app.use(cors({
    origin: '*', // Bütün saytlardan gələn sorğulara icazə verilir
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 2. ŞƏKİL PROXY (Thumbnaillərin bloklanmaması üçün)
app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("URL yoxdur");
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
            }
        });
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (e) {
        res.status(500).send("Proxy xətası");
    }
});

// 3. VİDEO MƏLUMATLARINI GƏTİRƏN ENDPOİNT (/api/info)
app.get('/api/info', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib." });

    try {
        // --- TIKTOK ÜÇÜN ---
        if (videoUrl.includes('tiktok.com')) {
            const response = await axios.post('https://www.tikwm.com/api/', { url: videoUrl, hd: 1 });
            const data = response.data.data;
            if (!data) throw new Error("TikTok videosu tapılmadı.");

            return res.json({
                title: data.title || "TikTok Videosu",
                thumbnail: data.cover,
                uploader: data.author.unique_id,
                duration: data.duration + " san",
                platform: "TikTok",
                description: data.title || "Yüksək keyfiyyətli TikTok videosu.",
                download_url: data.hdplay || data.play // HD linki üstünlükdür
            });
        } 
        
        // --- İNSTAGRAM ÜÇÜN ---
        else if (videoUrl.includes('instagram.com')) {
            const response = await axios.get(`https://api.vreden.my.id/api/igdownload?url=${encodeURIComponent(videoUrl)}`);
            // API massiv qaytardığı üçün ilk elementi götürürük
            const data = response.data.result[0]; 
            if (!data) throw new Error("İnstagram videosu tapılmadı.");

            return res.json({
                title: "İnstagram Videosu",
                thumbnail: data.thumbnail || "",
                uploader: "Instagram User",
                duration: "HD",
                platform: "Instagram",
                description: "Yüksək keyfiyyətli İnstagram videosu.",
                download_url: data.url // Orijinal mp4 linki
            });
        }

        res.status(400).json({ error: "Bu platforma hələ dəstəklənmir." });

    } catch (err) {
        console.error("Info Xətası:", err.message);
        res.status(500).json({ error: "Məlumatları alarkən xəta baş verdi. Linkin düzgünlüyünü yoxlayın." });
    }
});

// 4. VİDEONU MP4 KİMİ YÜKLƏYƏN ENDPOİNT (/api/download-video)
app.get('/api/download-video', async (req, res) => {
    const videoUrl = req.query.url;
    const rawTitle = req.query.title || "video";

    if (!videoUrl) return res.status(400).send("URL yoxdur");

    try {
        let directMp4Link = "";

        // TikTok HD linkini alırıq
        if (videoUrl.includes('tiktok.com')) {
            const response = await axios.post('https://www.tikwm.com/api/', { url: videoUrl, hd: 1 });
            directMp4Link = response.data.data.hdplay || response.data.data.play;
        } 
        // İnstagram HD linkini alırıq
        else if (videoUrl.includes('instagram.com')) {
            const response = await axios.get(`https://api.vreden.my.id/api/igdownload?url=${encodeURIComponent(videoUrl)}`);
            directMp4Link = response.data.result[0].url;
        } else {
            directMp4Link = videoUrl;
        }

        // Fayl adını təmizləyirik (Simvollar və uzunluq)
        const cleanTitle = rawTitle.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 80);

        // Videonu uzaq serverdən axın (stream) kimi çəkirik
        const videoResponse = await axios({
            method: 'get',
            url: directMp4Link,
            responseType: 'stream',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            }
        });

        // BRAUZERƏ YÜKLƏMƏ ƏMRİ VERİRİK (Fayl adı burada təyin olunur)
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanTitle)}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');

        // Videonu istifadəçiyə ötürürük
        videoResponse.data.pipe(res);

    } catch (e) {
        console.error("Yükləmə Xətası:", e.message);
        // Xəta olarsa (məsələn Vercel 10s timeout), birbaşa linkə yönləndiririk (fallback)
        res.redirect(videoUrl);
    }
});

// VERCEL ÜÇÜN EKSPORT
module.exports = app;
