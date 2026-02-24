require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const RAPID_KEY = process.env.RAPID_API_KEY || '6240a92415msha1d36872e3dd6d9p16a136jsn393bf73d3be1';
const IG_HOST = 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com';
const TT_HOST = 'tiktok-max-quality.p.rapidapi.com';

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

// 2. VİDEO MƏLUMATLARINI GƏTİRƏN HİSSƏ
app.get('/api/info', async (req, res) => {
    let videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib." });
    videoUrl = videoUrl.trim().split('?')[0];

    // --- TIKTOK HİSSƏSİ ---
    if (videoUrl.includes('tiktok.com')) {
        try {
            // Əvvəlcə RapidAPI yoxla
            const resTT = await axios.get(`https://${TT_HOST}/download/`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': TT_HOST },
                timeout: 5000
            });
            const d = resTT.data;
            return res.json({
                title: d.title || "TikTok Video",
                thumbnail: d.cover || "",
                uploader: d.author?.nickname || "User",
                duration: d.duration || "HD",
                platform: "TikTok",
                description: "Yüksək Keyfiyyət (RapidAPI)",
                download_url: d.video?.url || d.play
            });
        } catch (e) {
            console.log("TikTok RapidAPI xətası, Pulsuz API-yə keçilir...");
            // Fallback: Pulsuz TikWM API
            const ft = await axios.post('https://www.tikwm.com/api/', { url: videoUrl, hd: 1 });
            const fd = ft.data.data;
            return res.json({
                title: fd.title,
                thumbnail: fd.cover,
                uploader: fd.author.unique_id,
                duration: fd.duration + "s",
                platform: "TikTok",
                description: "Normal Keyfiyyət (Free API)",
                download_url: fd.hdplay || fd.play
            });
        }
    }

    // --- INSTAGRAM HİSSƏSİ ---
    if (videoUrl.includes('instagram.com')) {
        try {
            // Əvvəlcə RapidAPI yoxla
            const resIG = await axios.get(`https://${IG_HOST}/`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': IG_HOST },
                timeout: 5000
            });
            return res.json({
                title: "Instagram Video",
                thumbnail: resIG.data.thumbnail || "",
                uploader: "Instagram User",
                duration: "HD",
                platform: "Instagram",
                description: "Yüksək Keyfiyyət (RapidAPI)",
                download_url: resIG.data.url || resIG.data.download_url
            });
        } catch (e) {
            console.log("Instagram RapidAPI xətası, Pulsuz API-yə keçilir...");
            // Fallback: Pulsuz Jandev API
            const fi = await axios.get(`https://api.jandev.my.id/api/download/igdl?url=${encodeURIComponent(videoUrl)}`);
            const fid = fi.data.result[0];
            return res.json({
                title: "Instagram Video",
                thumbnail: fid.thumbnail,
                uploader: "User",
                duration: "HD",
                platform: "Instagram",
                description: "Normal Keyfiyyət (Free API)",
                download_url: fid.url
            });
        }
    }

    res.status(400).json({ error: "Platforma dəstəklənmir." });
});

app.get('/api/download-video', (req, res) => {
    res.redirect(req.query.url);
});

module.exports = app;
