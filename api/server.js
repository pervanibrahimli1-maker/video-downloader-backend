const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// 1. CORS TƏNZİMLƏMƏSİ (Bütün xətalar üçün)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 2. ŞƏKİL PROXY
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

// 3. VİDEO MƏLUMATLARINI GƏTİRƏN HİSSƏ (/api/info)
app.get('/api/info', async (req, res) => {
    let videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib." });

    // Linki təmizləyirik (lazımsız parametrləri silirik)
    videoUrl = videoUrl.split('?')[0];

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
                description: data.title || "TikTok HD Video",
                download_url: data.hdplay || data.play
            });
        } 
        
        // --- İNSTAGRAM ÜÇÜN (Yenilənmiş və daha stabil API) ---
        else if (videoUrl.includes('instagram.com')) {
            try {
                // Birinci Mənbə (Agatz API)
                const response = await axios.get(`https://api.agatz.xyz/api/instagram?url=${encodeURIComponent(videoUrl)}`);
                const data = response.data.data[0]; 
                
                if (data && data.url) {
                    return res.json({
                        title: "Instagram Videosu",
                        thumbnail: data.thumbnail || "",
                        uploader: "Instagram User",
                        duration: "HD",
                        platform: "Instagram",
                        description: "Yüksək keyfiyyətli Instagram videosu.",
                        download_url: data.url
                    });
                }
                throw new Error("Birinci API uğursuz oldu.");
            } catch (err) {
                // İkinci Mənbə (Fallback - Botcahx API)
                const fallbackRes = await axios.get(`https://api.botcahx.live/api/dowloader/igdl?url=${encodeURIComponent(videoUrl)}&apikey=neyo-key`);
                const fbData = fallbackRes.data.result[0];
                
                if (fbData && fbData.url) {
                    return res.json({
                        title: "Instagram Videosu",
                        thumbnail: fbData.thumbnail || "",
                        uploader: "Instagram User",
                        duration: "HD",
                        platform: "Instagram",
                        description: "Instagram videosu (Ehtiyat mənbə).",
                        download_url: fbData.url
                    });
                }
                throw new Error("Instagram videosu tapılmadı.");
            }
        }

        res.status(400).json({ error: "Bu platforma hələ dəstəklənmir." });

    } catch (err) {
        console.error("Xəta:", err.message);
        res.status(500).json({ error: "Məlumatları alarkən xəta baş verdi. Linki yoxlayın." });
    }
});

// 4. VİDEONU YÜKLƏYƏN HİSSƏ (/api/download-video)
app.get('/api/download-video', async (req, res) => {
    const videoUrl = req.query.url;
    const rawTitle = req.query.title || "video";

    if (!videoUrl) return res.status(400).send("URL yoxdur");

    try {
        const cleanTitle = rawTitle.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 80);

        // İstifadəçini birbaşa videonun orijinal linkinə yönləndiririk (Redirect)
        // Bu, Vercel-də 10 saniyəlik Timeout xətasının qarşısını alır (ƏN ETİBARLI YOL)
        res.redirect(videoUrl);

    } catch (e) {
        res.status(500).send("Yükləmə xətası.");
    }
});

module.exports = app;
