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

    // --- TIKTOK ---
    if (videoUrl.includes('tiktok.com')) {
        try {
            const resTT = await axios.get(`https://${TT_HOST}/download/`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': TT_HOST },
                timeout: 5000
            });
            if (resTT.data && (resTT.data.play || resTT.data.url)) {
                return res.json({
                    title: resTT.data.title || "TikTok Video",
                    thumbnail: resTT.data.cover || "",
                    uploader: resTT.data.author?.nickname || "User",
                    duration: resTT.data.duration || "HD",
                    platform: "TikTok",
                    description: "Premium (RapidAPI)",
                    download_url: resTT.data.video?.url || resTT.data.play || resTT.data.url
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

    // --- INSTAGRAM ---
    if (videoUrl.includes('instagram.com')) {
        // Cəhd 1: Sənin RapidAPI-n (Əgər Abunə olsan bu işləyəcək)
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

        // Cəhd 2: Agatz (Hazırda ən stabil pulsuz API)
        try {
            const resA = await axios.get(`https://api.agatz.xyz/api/instagram?url=${encodeURIComponent(videoUrl)}`, { timeout: 6000 });
            if (resA.data && resA.data.data && resA.data.data[0]) {
                return res.json({
                    title: "Instagram Video",
                    thumbnail: resA.data.data[0].thumbnail || "",
                    uploader: "User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Source Alpha",
                    download_url: resA.data.data[0].url
                });
            }
        } catch (e) { console.log("Agatz xətası."); }

        // Cəhd 3: Diego-OFC (Ehtiyat)
        try {
            const resD = await axios.get(`https://api.diego-ofc.xyz/api/v1/igdl?url=${encodeURIComponent(videoUrl)}`, { timeout: 6000 });
            if (resD.data && resD.data.data && resD.data.data[0]) {
                return res.json({
                    title: "Instagram Video",
                    thumbnail: resD.data.data[0].thumbnail || "",
                    uploader: "User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Source Beta",
                    download_url: resD.data.data[0].url
                });
            }
        } catch (e) { console.log("Diego xətası."); }

        // Cəhd 4: FastDl Proxy (Daha dözümlü)
        try {
            const resF = await axios.get(`https://api.vreden.web.id/api/igdownload?url=${encodeURIComponent(videoUrl)}`, { timeout: 6000 });
            if (resF.data && resF.data.result && resF.data.result[0]) {
                return res.json({
                    title: "Instagram Video",
                    thumbnail: resF.data.result[0].thumbnail || "",
                    uploader: "User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Source Gamma",
                    download_url: resF.data.result[0].url
                });
            }
        } catch (e) { console.log("Vreden xətası."); }
    }

    res.status(404).json({ error: "Video tapılmadı. Hesab gizli ola bilər və ya bütün API-lər bloklanıb." });
});

app.get('/api/download-video', (req, res) => {
    if (!req.query.url) return res.status(400).send("URL yoxdur");
    res.redirect(req.query.url);
});

module.exports = app;
