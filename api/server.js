const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// 1. Şəkil Proxy (Şəkillərin bloklanmaması üçün)
app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("URL yoxdur");
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (e) {
        res.status(500).send("Proxy xətası");
    }
});

// 2. VİDEO MƏLUMATLARINI GƏTİRƏN HİSSƏ (/api/info)
app.get('/api/info', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib." });

    try {
        // TIKTOK ÜÇÜN (TikWM API istifadə edirik - Sürətli və Pulsuz)
        if (videoUrl.includes('tiktok.com')) {
            const response = await axios.post('https://www.tikwm.com/api/', {
                url: videoUrl,
                hd: 1
            });

            const data = response.data.data;
            if (!data) throw new Error("Video tapılmadı.");

            return res.json({
                title: data.title || "TikTok Videosu",
                thumbnail: data.cover,
                uploader: data.author.unique_id,
                duration: data.duration + " san",
                platform: "TikTok",
                description: data.title || "TikTok-dan yüklənən video.",
                download_url: data.play // Bu birbaşa mp4 linkidir
            });
        } 
        
        // INSTAGRAM ÜÇÜN (Ehtiyat plan)
        else if (videoUrl.includes('instagram.com')) {
            // Instagram üçün bura öz API-nı yerləşdirə bilərsən. 
            // Hazırda nümunə məlumat qaytarıram:
            return res.json({
                title: "Instagram Videosu",
                thumbnail: "https://via.placeholder.com/150",
                uploader: "Instagram User",
                duration: "N/A",
                platform: "Instagram",
                description: "Instagram videoları üçün xüsusi API lazımdır.",
                download_url: videoUrl
            });
        }

        res.status(400).json({ error: "Dəstəklənməyən platforma." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Video məlumatları alınarkən xəta baş verdi." });
    }
});

// 3. VİDEONU YÜKLƏYƏN HİSSƏ (/api/download-video)
app.get('/api/download-video', async (req, res) => {
    const videoUrl = req.query.url;
    const rawTitle = req.query.title || "video"; // Frontend-dən gələn başlığı götürürük

    if (!videoUrl) return res.status(400).send("URL yoxdur");

    try {
        let directLink = "";

        // TikTok üçün linki alırıq
        if (videoUrl.includes('tiktok.com')) {
            const response = await axios.post('https://www.tikwm.com/api/', { url: videoUrl });
            directLink = response.data.data.play;
        } else {
            directLink = videoUrl;
        }

        // Fayl adını təmizləyirik (Sistem xətası verməməsi üçün)
        const cleanTitle = rawTitle.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100);

        // Videonu axın (stream) şəklində alırıq
        const videoResponse = await axios({
            method: 'get',
            url: directLink,
            responseType: 'stream'
        });

        // Brauzerə fayl adını təqdim edirik
        // 'inline' yerinə 'attachment' yazırıq ki, birbaşa yüklənsin
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanTitle)}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');

        // Videonu istifadəçiyə göndəririk
        videoResponse.data.pipe(res);

    } catch (e) {
        console.error("Yükləmə xətası:", e.message);
        res.status(500).send("Video yüklənərkən xəta baş verdi.");
    }
});
module.exports = app;
