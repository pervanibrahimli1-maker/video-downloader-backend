const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// 1. Şəkil Proxy
app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("URL yoxdur");
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (e) {
        res.status(500).send("Proxy xətası");
    }
});

// 2. VİDEO MƏLUMATLARINI GƏTİRƏN HİSSƏ (/api/info)
app.get('/api/info', async (req, res) => {
    let videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib." });

    videoUrl = videoUrl.trim().split('?')[0];

    try {
        // --- TIKTOK ÜÇÜN (TikWM - Stabil) ---
        if (videoUrl.includes('tiktok.com')) {
            const response = await axios.post('https://www.tikwm.com/api/', { url: videoUrl, hd: 1 }, { timeout: 8000 });
            const data = response.data.data;
            if (!data) throw new Error("TikTok videosu tapılmadı.");

            return res.json({
                title: data.title || "TikTok Videosu",
                thumbnail: data.cover,
                uploader: data.author.unique_id,
                duration: data.duration + " san",
                platform: "TikTok",
                description: data.title || "Yüksək keyfiyyətli TikTok videosu.",
                download_url: data.hdplay || data.play
            });
        } 
        
        // --- İNSTAGRAM ÜÇÜN (YENİ AKTİV APİ-LƏR) ---
        else if (videoUrl.includes('instagram.com')) {
            let igData = null;

            // Mənbə 1: Diego-OFC API (Hal-hazırda ən sürətli)
            try {
                const res1 = await axios.get(`https://api.diego-ofc.xyz/api/v1/igdl?url=${encodeURIComponent(videoUrl)}`, { timeout: 7000 });
                if (res1.data && res1.data.data && res1.data.data[0]) {
                    igData = {
                        url: res1.data.data[0].url,
                        thumb: res1.data.data[0].thumbnail
                    };
                }
            } catch (e) { console.log("Mənbə 1 (Diego) işləmədi"); }

            // Mənbə 2: Vreden API (Ehtiyat)
            if (!igData) {
                try {
                    const res2 = await axios.get(`https://api.vreden.web.id/api/igdownload?url=${encodeURIComponent(videoUrl)}`, { timeout: 7000 });
                    if (res2.data && res2.data.result && res2.data.result[0]) {
                        igData = {
                            url: res2.data.result[0].url,
                            thumb: res2.data.result[0].thumbnail
                        };
                    }
                } catch (e) { console.log("Mənbə 2 (Vreden) işləmədi"); }
            }

            if (igData && igData.url) {
                return res.json({
                    title: "Instagram Videosu",
                    thumbnail: igData.thumb || "",
                    uploader: "Instagram User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Yüksək keyfiyyətli Instagram videosu.",
                    download_url: igData.url
                });
            } else {
                return res.status(404).json({ error: "Instagram videosu tapılmadı. Hesab gizli ola bilər və ya link xətalıdır." });
            }
        }

        res.status(400).json({ error: "Dəstəklənməyən platforma." });

    } catch (err) {
        console.error("Global Error:", err.message);
        res.status(500).json({ error: "Server xətası baş verdi. Bir az sonra yenidən yoxlayın." });
    }
});

// 3. VİDEO YÜKLƏMƏ
app.get('/api/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("URL yoxdur");
    res.redirect(videoUrl);
});

module.exports = app;
