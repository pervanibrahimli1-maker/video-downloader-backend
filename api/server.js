require('dotenv').config(); // .env faylını oxumaq üçün
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

// 2. VİDEO MƏLUMATLARINI GƏTİRƏN HİSSƏ
app.get('/api/info', async (req, res) => {
    let videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL daxil edilməyib." });
    videoUrl = videoUrl.trim().split('?')[0];

    // --- TIKTOK (Sənin RapidAPI-n - TikTok Max Quality) ---
    if (videoUrl.includes('tiktok.com')) {
        try {
            const options = {
                method: 'GET',
                url: `https://${TT_HOST}/download/`,
                params: { url: videoUrl },
                headers: {
                    'x-rapidapi-key': RAPID_KEY,
                    'x-rapidapi-host': TT_HOST
                },
                timeout: 7000
            };
            const response = await axios.request(options);
            const data = response.data;

            if (data && !data.error) {
                return res.json({
                    title: data.title || "TikTok Video",
                    thumbnail: data.cover || data.thumbnail || "",
                    uploader: data.author?.nickname || "User",
                    duration: data.duration || "HD",
                    platform: "TikTok",
                    description: "Premium Quality (RapidAPI)",
                    download_url: data.video?.url || data.play || data.url
                });
            }
        } catch (e) { console.log("TikTok API xətası. Limit dolmuş ola bilər."); }
    }

    // --- İNSTAGRAM (Sənin RapidAPI-n - 7scorp API) ---
    if (videoUrl.includes('instagram.com')) {
        try {
            const options = {
                method: 'GET',
                url: `https://${IG_HOST}/unified/url`,
                params: { url: videoUrl },
                headers: {
                    'x-rapidapi-key': RAPID_KEY,
                    'x-rapidapi-host': IG_HOST
                },
                timeout: 8000
            };
            const response = await axios.request(options);
            const data = response.data;

            if (data && !data.error) {
                return res.json({
                    title: "Instagram Videosu",
                    thumbnail: data.thumbnail || data.cover || "",
                    uploader: "Instagram User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Premium Quality (RapidAPI)",
                    download_url: data.media || data.url || data.downloadUrl
                });
            }
        } catch (e) { console.log("Instagram API xətası. Limit dolmuş ola bilər."); }
    }

    res.status(404).json({ error: "Video tapılmadı. Hesab gizli ola bilər və ya API limiti bitib." });
});

// 3. YÜKLƏMƏ
app.get('/api/download-video', (req, res) => {
    if (!req.query.url) return res.status(400).send("URL yoxdur");
    res.redirect(req.query.url);
});

module.exports = app;
