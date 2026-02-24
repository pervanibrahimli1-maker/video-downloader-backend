require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// ENV Dəyişənləri (Vercel-dən götürülür)
const RAPID_KEY = process.env.RAPID_API_KEY;
const IG_HOST = process.env.IG_HOST;
const TT_HOST = process.env.TT_HOST;

// 1. Şəkil Proxy (Şəkillərin görünməməsi problemini həll edir)
app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("URL yoxdur");
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.send(response.data);
    } catch (e) {
        res.status(500).send("Proxy xətası");
    }
});

// 2. Video Məlumatları (/api/info)
app.get('/api/info', async (req, res) => {
    let videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib." });
    videoUrl = videoUrl.trim().split('?')[0];

    try {
        // --- TIKTOK ---
        if (videoUrl.includes('tiktok.com')) {
            const resTT = await axios.get(`https://${TT_HOST}/download/`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': TT_HOST }
            });
            const d = resTT.data;
            return res.json({
                title: d.title || "TikTok Video",
                thumbnail: d.cover || d.thumbnail || "",
                uploader: d.author?.nickname || "User",
                duration: d.duration || "HD",
                platform: "TikTok",
                description: "Premium Quality (RapidAPI)",
                download_url: d.video?.url || d.play || d.url
            });
        } 

        // --- INSTAGRAM ---
        if (videoUrl.includes('instagram.com')) {
            const resIG = await axios.get(`https://${IG_HOST}/unified/url`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': IG_HOST }
            });
            const d = resIG.data;
            return res.json({
                title: "Instagram Videosu",
                thumbnail: d.thumbnail || d.cover || (d.result && d.result.thumbnail) || "",
                uploader: "Instagram User",
                duration: "HD",
                platform: "Instagram",
                description: "Premium Quality (RapidAPI)",
                download_url: d.media || d.url || d.downloadUrl
            });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Məlumat alınarkən xəta baş verdi." });
    }
});

// 3. Videonu MP4 kimi YÜKLƏYƏN hissə
app.get('/api/download-video', async (req, res) => {
    const videoUrl = req.query.url;
    const title = req.query.title || "video";
    if (!videoUrl) return res.status(400).send("URL yoxdur");

    try {
        const videoResponse = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // Bu başlıqlar videonu brauzerdə açmaq əvəzinə yüklədir
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');
        videoResponse.data.pipe(res);
    } catch (e) {
        res.redirect(videoUrl); // Xəta olsa heç olmasa videonu açsın
    }
});

module.exports = app;
