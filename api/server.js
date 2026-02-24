require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// API Key məlumatları
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

    // --- TIKTOK MƏNTİQİ ---
    if (videoUrl.includes('tiktok.com')) {
        // Cəhd 1: RapidAPI
        try {
            const resTT = await axios.get(`https://${TT_HOST}/download/`, {
                params: { url: videoUrl },
                headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': TT_HOST },
                timeout: 5000
            });
            if (resTT.data && (resTT.data.url || resTT.data.play)) {
                return res.json({
                    title: resTT.data.title || "TikTok Video",
                    thumbnail: resTT.data.cover || "",
                    uploader: resTT.data.author?.nickname || "User",
                    duration: resTT.data.duration || "HD",
                    platform: "TikTok",
                    description: "Premium Quality (RapidAPI)",
                    download_url: resTT.data.video?.url || resTT.data.play
                });
            }
        } catch (e) { console.log("TikTok RapidAPI xətası (403/429/Timeout), Fallback-ə keçilir."); }

        // Cəhd 2: TikWM (Pulsuz ehtiyat)
        try {
            const ft = await axios.post('https://www.tikwm.com/api/', { url: videoUrl, hd: 1 }, { timeout: 5000 });
            if (ft.data && ft.data.data) {
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
            }
        } catch (e) { console.log("TikWM ehtiyatı da işləmədi."); }
    }

    // --- INSTAGRAM MƏNTİQİ ---
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
                    description: "Premium Quality (RapidAPI)",
                    download_url: resIG.data.url || resIG.data.download_url
                });
            }
        } catch (e) { console.log("Instagram RapidAPI xətası (403/429/Timeout), Fallback-ə keçilir."); }

        // Cəhd 2: Diego-OFC (Ehtiyat)
        try {
            const fi = await axios.get(`https://api.diego-ofc.xyz/api/v1/igdl?url=${encodeURIComponent(videoUrl)}`, { timeout: 6000 });
            if (fi.data && fi.data.data && fi.data.data[0]) {
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
        } catch (e) { console.log("Diego ehtiyatı işləmədi."); }

        // Cəhd 3: Ametrins (Son ehtiyat)
        try {
            const fa = await axios.get(`https://api.ametrins.my.id/api/dowloader/instagram?url=${encodeURIComponent(videoUrl)}`, { timeout: 6000 });
            if (fa.data && fa.data.data && fa.data.data[0]) {
                return res.json({
                    title: "Instagram Video",
                    thumbnail: fa.data.data[0].thumbnail,
                    uploader: "User",
                    duration: "HD",
                    platform: "Instagram",
                    description: "Standard Quality (Ametrins)",
                    download_url: fa.data.data[0].url
                });
            }
        } catch (e) { console.log("Ametrins ehtiyatı işləmədi."); }
    }

    // Heç biri işləməsə 404 qaytarırıq (500 yox!)
    res.status(404).json({ error: "Video tapılmadı və ya bütün API-lər məşğuldur." });
});

// Yükləmə endpointi
app.get('/api/download-video', (req, res) => {
    if (!req.query.url) return res.status(400).send("URL yoxdur");
    res.redirect(req.query.url);
});

module.exports = app;
