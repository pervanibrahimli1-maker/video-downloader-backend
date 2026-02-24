require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const RAPID_KEY = process.env.RAPID_API_KEY;
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
    
    // Linki tam təmizləyirik
    videoUrl = videoUrl.trim().split('?')[0];
    if (videoUrl.endsWith('/')) videoUrl = videoUrl.slice(0, -1);

    // --- TIKTOK HİSSƏSİ ---
    if (videoUrl.includes('tiktok.com')) {
        try {
            const resTT = await axios.get(`https://${TT_HOST}/download/`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': TT_HOST },
                timeout: 5000
            });
            if (resTT.data && resTT.data.play) {
                return res.json({
                    title: resTT.data.title || "TikTok Video",
                    thumbnail: resTT.data.cover || "",
                    uploader: resTT.data.author?.nickname || "User",
                    duration: resTT.data.duration || "HD",
                    platform: "TikTok",
                    description: "Premium (RapidAPI)",
                    download_url: resTT.data.video?.url || resTT.data.play
                });
            }
        } catch (e) { console.log("TikTok RapidAPI xətası."); }

        try {
            const ft = await axios.post('https://www.tikwm.com/api/', { url: videoUrl, hd: 1 }, { timeout: 5000 });
            if (ft.data && ft.data.data) {
                return res.json({
                    title: ft.data.data.title,
                    thumbnail: ft.data.data.cover,
                    uploader: ft.data.data.author.unique_id,
                    duration: ft.data.data.duration + "s",
                    platform: "TikTok",
                    description: "Standard (TikWM)",
                    download_url: ft.data.data.hdplay || ft.data.data.play
                });
            }
        } catch (e) { console.log("TikWM xətası."); }
    }

    // --- INSTAGRAM HİSSƏSİ ---
    if (videoUrl.includes('instagram.com')) {
        // Cəhd 1: RapidAPI
        try {
            const resIG = await axios.get(`https://${IG_HOST}/`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': IG_HOST },
                timeout: 5000
            });
            if (resIG.data && (resIG.data.url || resIG.data.download_url)) {
                return res.json({
                    title: "Instagram Video",
                    thumbnail: resIG.data.thumbnail || "",
                    uploader: "Instagram User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Premium (RapidAPI)",
                    download_url: resIG.data.url || resIG.data.download_url
                });
            }
        } catch (e) { console.log("IG RapidAPI uğursuz."); }

        // Cəhd 2: Vreden API (Hazırda aktivdir)
        try {
            const resV = await axios.get(`https://api.vreden.web.id/api/igdownload?url=${encodeURIComponent(videoUrl)}`, { timeout: 6000 });
            if (resV.data && resV.data.result && resV.data.result[0]) {
                return res.json({
                    title: "Instagram Video",
                    thumbnail: resV.data.result[0].thumbnail || "",
                    uploader: "User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Source B",
                    download_url: resV.data.result[0].url
                });
            }
        } catch (e) { console.log("Vreden xətası."); }

        // Cəhd 3: Sandip API (Yeni mənbə)
        try {
            const resS = await axios.get(`https://api.sandipbaruwal.com/instadl?url=${encodeURIComponent(videoUrl)}`, { timeout: 6000 });
            if (resS.data && resS.data.link) {
                return res.json({
                    title: "Instagram Video",
                    thumbnail: "",
                    uploader: "User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Source C",
                    download_url: resS.data.link
                });
            }
        } catch (e) { console.log("Sandip xətası."); }

        // Cəhd 4: Widipe API (Fallback)
        try {
            const resW = await axios.get(`https://widipe.com/download/igdl?url=${encodeURIComponent(videoUrl)}`, { timeout: 6000 });
            if (resW.data && resW.data.result && resW.data.result[0]) {
                return res.json({
                    title: "Instagram Video",
                    thumbnail: resW.data.result[0].thumbnail || "",
                    uploader: "User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Source D",
                    download_url: resW.data.result[0].url
                });
            }
        } catch (e) { console.log("Widipe xətası."); }
    }

    res.status(404).json({ error: "Video tapılmadı. Hesab gizli ola bilər və ya serverlər bloklanıb." });
});

app.get('/api/download-video', (req, res) => {
    if (!req.query.url) return res.status(400).send("URL yoxdur");
    res.redirect(req.query.url);
});

module.exports = app;
