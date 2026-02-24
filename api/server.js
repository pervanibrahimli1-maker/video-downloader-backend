require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const RAPID_KEY = process.env.RAPID_API_KEY;
const IG_HOST = process.env.IG_HOST;
const TT_HOST = process.env.TT_HOST;

app.get('/api/info', async (req, res) => {
    let videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib." });
    videoUrl = videoUrl.trim().split('?')[0];

    // --- TIKTOK MƏNTİQİ ---
    if (videoUrl.includes('tiktok.com')) {
        try {
            // 1. Sənin RapidAPI-ni yoxlayırıq
            const resTT = await axios.get(`https://${TT_HOST}/download/`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': TT_HOST },
                timeout: 5000
            });
            
            const d = resTT.data;
            const video = d.video?.url || d.play || d.url || (d.data && d.data.play);

            if (video) {
                return res.json({
                    title: d.title || "TikTok Video",
                    thumbnail: d.cover || d.thumbnail || "",
                    uploader: d.author?.nickname || "User",
                    duration: d.duration || "HD",
                    platform: "TikTok",
                    download_url: video
                });
            }
            throw new Error("RapidAPI boş döndü"); // Əgər RapidAPI tapmasa, catch-ə atır
        } catch (e) {
            console.log("RapidAPI uğursuz, TikWM (Ehtiyat) işə düşür...");
            
            // 2. FALLBACK: TikWM (Dünyanın ən stabil TikTok API-si)
            try {
                const ft = await axios.post('https://www.tikwm.com/api/', { url: videoUrl, hd: 1 });
                const fd = ft.data.data;
                if (fd) {
                    return res.json({
                        title: fd.title || "TikTok Video",
                        thumbnail: fd.cover,
                        uploader: fd.author.unique_id,
                        duration: fd.duration + "s",
                        platform: "TikTok",
                        download_url: fd.hdplay || fd.play
                    });
                }
            } catch (err) {
                return res.status(404).json({ error: "Video tapılmadı. Linki yoxlayın." });
            }
        }
    }

    // --- INSTAGRAM MƏNTİQİ ---
    if (videoUrl.includes('instagram.com')) {
        try {
            // 1. Sənin RapidAPI-ni yoxlayırıq
            const resIG = await axios.get(`https://${IG_HOST}/unified/url`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': IG_HOST },
                timeout: 5000
            });
            const d = resIG.data;
            const video = d.media || d.url || d.downloadUrl || (d.result && d.result.url);

            if (video) {
                return res.json({
                    title: d.title || d.caption || "Instagram Video",
                    thumbnail: d.thumbnail || d.cover || (d.result && d.result.thumbnail) || "",
                    uploader: "Instagram User",
                    duration: "HD",
                    platform: "Instagram",
                    download_url: video
                });
            }
            throw new Error("Instagram RapidAPI boş döndü");
        } catch (e) {
            console.log("Instagram RapidAPI uğursuz, Diego (Ehtiyat) işə düşür...");
            
            // 2. FALLBACK: Diego API
            try {
                const fi = await axios.get(`https://api.diego-ofc.xyz/api/v1/igdl?url=${encodeURIComponent(videoUrl)}`);
                if (fi.data && fi.data.data[0]) {
                    return res.json({
                        title: "Instagram Video",
                        thumbnail: fi.data.data[0].thumbnail,
                        uploader: "User",
                        duration: "HD",
                        platform: "Instagram",
                        download_url: fi.data.data[0].url
                    });
                }
            } catch (err) {
                return res.status(404).json({ error: "Instagram videosu tapılmadı." });
            }
        }
    }

    res.status(404).json({ error: "Dəstəklənməyən link." });
});

app.get('/api/proxy-image', async (req, res) => {
    try {
        const response = await axios.get(req.query.url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.send(response.data);
    } catch (e) { res.status(500).send("error"); }
});

app.get('/api/download-video', (req, res) => {
    res.redirect(req.query.url);
});

module.exports = app;
