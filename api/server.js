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

app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl || imageUrl === 'undefined') return res.status(400).send("URL yoxdur");
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.send(response.data);
    } catch (e) { res.status(500).send("Proxy xətası"); }
});

app.get('/api/info', async (req, res) => {
    let videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL yoxdur" });
    videoUrl = videoUrl.trim().split('?')[0];

    try {
        if (videoUrl.includes('tiktok.com')) {
            const resTT = await axios.get(`https://${TT_HOST}/download/`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': TT_HOST }
            });
            const d = resTT.data;
            // TikTok strukturunu dəqiqləşdiririk
            return res.json({
                title: d.title || "TikTok Videosu",
                thumbnail: d.cover || d.thumbnail || d.origin_cover || "",
                uploader: d.author?.nickname || d.author?.unique_id || "User",
                duration: d.duration || "HD",
                platform: "TikTok",
                description: "Premium Quality",
                download_url: d.video?.url || d.play || d.url || ""
            });
        } 

        if (videoUrl.includes('instagram.com')) {
            const resIG = await axios.get(`https://${IG_HOST}/unified/url`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': IG_HOST }
            });
            const d = resIG.data;
            // Instagram strukturunu dəqiqləşdiririk
            return res.json({
                title: d.title || "Instagram Videosu",
                thumbnail: d.thumbnail || d.cover || (d.result && d.result.thumbnail) || "",
                uploader: "Instagram User",
                duration: "HD",
                platform: "Instagram",
                description: "Premium Quality",
                download_url: d.media || d.url || d.downloadUrl || ""
            });
        }
    } catch (err) {
        res.status(500).json({ error: "API məlumat verə bilmədi." });
    }
});

// Vercel-də videonun korlanmaması üçün birbaşa yönləndirmə
app.get('/api/download-video', (req, res) => {
    if (!req.query.url) return res.status(400).send("URL yoxdur");
    res.redirect(req.query.url);
});

module.exports = app;
