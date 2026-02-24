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

    try {
        console.log(`Axtarılır: ${videoUrl}`);

        // --- TIKTOK ---
        if (videoUrl.includes('tiktok.com')) {
            const resTT = await axios.get(`https://${TT_HOST}/download/`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': TT_HOST }
            });
            
            console.log("TikTok API Cavabı:", JSON.stringify(resTT.data));
            const d = resTT.data;
            const video = d.video?.url || d.play || d.url || (d.data && d.data.play);

            if (!video) throw new Error("TikTok video linki tapılmadı");

            return res.json({
                title: d.title || "TikTok Video",
                thumbnail: d.cover || d.thumbnail || "",
                uploader: d.author?.nickname || "User",
                duration: d.duration || "HD",
                platform: "TikTok",
                download_url: video
            });
        } 

        // --- INSTAGRAM ---
        if (videoUrl.includes('instagram.com')) {
            const resIG = await axios.get(`https://${IG_HOST}/unified/url`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': IG_HOST }
            });

            console.log("Instagram API Cavabı:", JSON.stringify(resIG.data));
            const d = resIG.data;
            const video = d.media || d.url || d.downloadUrl || (d.result && d.result.url);

            if (!video) throw new Error("Instagram video linki tapılmadı");

            return res.json({
                title: d.title || d.caption || "Instagram Video",
                thumbnail: d.thumbnail || d.cover || (d.result && d.result.thumbnail) || "",
                uploader: "Instagram User",
                duration: "HD",
                platform: "Instagram",
                download_url: video
            });
        }
    } catch (err) {
        console.error("Xəta baş verdi:", err.message);
        res.status(500).json({ error: "Video tapılmadı və ya API xətası: " + err.message });
    }
});

app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.send(response.data);
    } catch (e) { res.status(500).send("error"); }
});

app.get('/api/download-video', (req, res) => {
    const url = req.query.url;
    if (!url || url === 'undefined') return res.status(400).send("Link tapılmadı");
    res.redirect(url);
});

module.exports = app;
