require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Dəyişənləri ENV-dən götürürük
const RAPID_KEY = process.env.RAPID_API_KEY;
const IG_HOST = process.env.IG_HOST;
const TT_HOST = process.env.TT_HOST;

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
    } catch (e) { res.status(500).send("Proxy xətası"); }
});

// 2. VİDEO MƏLUMATLARINI GƏTİRƏN HİSSƏ (/api/info)
app.get('/api/info', async (req, res) => {
    let videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib." });
    
    videoUrl = videoUrl.trim().split('?')[0];

    // --- TIKTOK MƏNTİQİ ---
    if (videoUrl.includes('tiktok.com')) {
        try {
            // RapidAPI cəhdi
            const resTT = await axios.get(`https://${TT_HOST}/download/`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': TT_HOST },
                timeout: 7000
            });
            if (resTT.data) {
                return res.json({
                    title: resTT.data.title || "TikTok Video",
                    thumbnail: resTT.data.cover || "",
                    uploader: resTT.data.author?.nickname || "User",
                    duration: resTT.data.duration || "HD",
                    platform: "TikTok",
                    description: "Premium Quality (RapidAPI)",
                    download_url: resTT.data.video?.url || resTT.data.play || resTT.data.url
                });
            }
        } catch (e) { console.log("TikTok RapidAPI xətası, Fallback-ə keçilir."); }

        // TikWM Fallback
        try {
            const ft = await axios.post('https://www.tikwm.com/api/', { url: videoUrl, hd: 1 });
            const fd = ft.data.data;
            return res.json({
                title: fd.title,
                thumbnail: fd.cover,
                uploader: fd.author.unique_id,
                duration: fd.duration + "s",
                platform: "TikTok",
                description: "Standard Quality (TikWM)",
                download_url: fd.hdplay || fd.play
            });
        } catch (e) { console.log("TikTok tamamilə uğursuz."); }
    }

    // --- İNSTAGRAM MƏNTİQİ (YENİ APİ - 7scorp) ---
    if (videoUrl.includes('instagram.com')) {
        try {
            const resIG = await axios.get(`https://${IG_HOST}/unified/url`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': IG_HOST },
                timeout: 8000
            });
            
            const data = resIG.data;
            if (data && !data.error) {
                return res.json({
                    title: "Instagram Videosu",
                    thumbnail: data.thumbnail || data.cover || "",
                    uploader: "Instagram User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Premium Quality (7scorp API)",
                    download_url: data.media || data.url || data.download_url
                });
            }
        } catch (e) { console.log("Instagram RapidAPI xətası, Fallback-ə keçilir."); }

        // Diego Fallback
        try {
            const fi = await axios.get(`https://api.diego-ofc.xyz/api/v1/igdl?url=${encodeURIComponent(videoUrl)}`, { timeout: 6000 });
            if (fi.data && fi.data.data[0]) {
                return res.json({
                    title: "Instagram Video",
                    thumbnail: fi.data.data[0].thumbnail,
                    uploader: "User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Standard Quality (Diego)",
                    download_url: fi.data.data[0].url
                });
            }
        } catch (err) { console.log("Instagram tamamilə uğursuz."); }
    }

    res.status(404).json({ error: "Video tapılmadı və ya bütün API-lər məşğuldur." });
});

// 3. YÜKLƏMƏ
app.get('/api/download-video', (req, res) => {
    if (!req.query.url) return res.status(400).send("URL yoxdur");
    res.redirect(req.query.url);
});

module.exports = app;
