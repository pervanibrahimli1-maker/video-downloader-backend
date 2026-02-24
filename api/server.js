require('dotenv').config(); // .env faylını oxumaq üçün
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// API Məlumatlarını ENV-dən götürürük
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
        // --- TIKTOK ÜÇÜN (RapidAPI - TikTok Max Quality) ---
        if (videoUrl.includes('tiktok.com')) {
            const options = {
                method: 'GET',
                url: `https://${TT_HOST}/download/`,
                params: { url: videoUrl },
                headers: {
                    'x-rapidapi-key': RAPID_KEY,
                    'x-rapidapi-host': TT_HOST
                }
            };

            const response = await axios.request(options);
            const data = response.data; // API-dan gələn cavab

            return res.json({
                title: data.title || "TikTok Videosu",
                thumbnail: data.cover || data.thumbnail || "",
                uploader: data.author?.nickname || "TikTok User",
                duration: data.duration || "HD",
                platform: "TikTok",
                description: data.title || "Yüksək keyfiyyətli TikTok videosu.",
                download_url: data.video?.url || data.url || data.play
            });
        } 
        
        // --- İNSTAGRAM ÜÇÜN (RapidAPI) ---
        else if (videoUrl.includes('instagram.com')) {
            const options = {
                method: 'GET',
                url: `https://${IG_HOST}/`,
                params: { url: videoUrl },
                headers: {
                    'x-rapidapi-key': RAPID_KEY,
                    'x-rapidapi-host': IG_HOST
                }
            };

            const response = await axios.request(options);
            const data = response.data;

            return res.json({
                title: "Instagram Videosu",
                thumbnail: data.thumbnail || "",
                uploader: "Instagram User",
                duration: "HD",
                platform: "Instagram",
                description: "Yüksək keyfiyyətli Instagram videosu.",
                download_url: data.url || data.download_url || (Array.isArray(data) ? data[0].url : "")
            });
        }

        res.status(400).json({ error: "Dəstəklənməyən platforma." });

    } catch (err) {
        console.error("API Xətası:", err.message);
        res.status(500).json({ error: "Video tapılmadı və ya API limiti bitib." });
    }
});

// 3. YÜKLƏMƏ
app.get('/api/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("URL yoxdur");
    res.redirect(videoUrl);
});

module.exports = app;
