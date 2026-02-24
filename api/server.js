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
        // --- TIKTOK ÜÇÜN (Stabil) ---
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
                description: data.title || "TikTok HD Video",
                download_url: data.hdplay || data.play
            });
        } 
        
        // --- İNSTAGRAM ÜÇÜN (YENİ GÜCLÜ MƏNBƏLƏR) ---
        else if (videoUrl.includes('instagram.com')) {
            let igData = null;

            // Mənbə 1: Abhitools (Çox vaxt ən stabil olanı)
            try {
                const res1 = await axios.get(`https://ig.abhitools.in/api/v1/download?url=${encodeURIComponent(videoUrl)}`, { timeout: 8000 });
                if (res1.data && res1.data.data && res1.data.data[0]) {
                    igData = {
                        url: res1.data.data[0].url,
                        thumb: res1.data.data[0].thumbnail
                    };
                }
            } catch (e) { console.log("Abhitools uğursuz"); }

            // Mənbə 2: Agatz API
            if (!igData) {
                try {
                    const res2 = await axios.get(`https://api.agatz.xyz/api/instagram?url=${encodeURIComponent(videoUrl)}`, { timeout: 8000 });
                    if (res2.data && res2.data.data && res2.data.data[0]) {
                        igData = {
                            url: res2.data.data[0].url,
                            thumb: res2.data.data[0].thumbnail || ""
                        };
                    }
                } catch (e) { console.log("Agatz uğursuz"); }
            }

            // Mənbə 3: TiklyDown (Bəzən IG dəstəkləyir)
            if (!igData) {
                try {
                    const res3 = await axios.get(`https://api.tiklydown.eu.org/api/download/insta?url=${encodeURIComponent(videoUrl)}`, { timeout: 8000 });
                    if (res3.data && res3.data.result && res3.data.result[0]) {
                        igData = {
                            url: res3.data.result[0].url,
                            thumb: res3.data.result[0].thumbnail
                        };
                    }
                } catch (e) { console.log("TiklyDown uğursuz"); }
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
                return res.status(404).json({ error: "Video tapılmadı. Hesab gizli ola bilər və ya linkdə problem var." });
            }
        }

        res.status(400).json({ error: "Platforma dəstəklənmir." });

    } catch (err) {
        res.status(500).json({ error: "Serverdə xəta baş verdi. Bir az sonra yoxlayın." });
    }
});

// 3. VİDEO YÜKLƏMƏ
app.get('/api/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("URL yoxdur");
    res.redirect(videoUrl);
});

module.exports = app;
