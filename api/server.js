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

// 1. Şəkil Proxy
app.get('/api/proxy-image', async (req, res) => {
    try {
        const response = await axios.get(req.query.url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } });
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.send(response.data);
    } catch (e) { res.status(500).send("error"); }
});

// 2. VİDEO MƏLUMATLARINI GƏTİRƏN HİSSƏ
app.get('/api/info', async (req, res) => {
    let videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL yoxdur" });
    videoUrl = videoUrl.trim().split('?')[0];

    try {
        // --- TIKTOK (Video linkinə üstünlük verilir) ---
        if (videoUrl.includes('tiktok.com')) {
            const ft = await axios.post('https://www.tikwm.com/api/', { url: videoUrl, hd: 1 }, { timeout: 5000 });
            const fd = ft.data.data;
            if (fd && fd.play) { // Musiqi yox, mütləq video linki (play)
                return res.json({
                    title: fd.title || "TikTok Video",
                    thumbnail: fd.cover,
                    uploader: fd.author.unique_id,
                    duration: fd.duration + "s",
                    platform: "TikTok",
                    download_url: fd.hdplay || fd.play
                });
            }
        }

        // --- INSTAGRAM (Video linkinə üstünlük verilir) ---
        if (videoUrl.includes('instagram.com')) {
            // Birinci Premium API
            try {
                const resIG = await axios.get(`https://${IG_HOST}/unified/url`, {
                    params: { url: videoUrl },
                    headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': IG_HOST },
                    timeout: 7000
                });
                const d = resIG.data;
                const video = d.media || d.url || (d.result && d.result[0]?.url);
                if (video) return res.json({
                    title: "Instagram Video",
                    thumbnail: d.thumbnail || d.cover || "",
                    uploader: "User",
                    duration: "HD",
                    platform: "Instagram",
                    download_url: video
                });
            } catch (e) {}

            // Ehtiyat Diego API
            const fi = await axios.get(`https://api.diego-ofc.xyz/api/v1/igdl?url=${encodeURIComponent(videoUrl)}`);
            if (fi.data && fi.data.data[0]) return res.json({
                title: "Instagram Video",
                thumbnail: fi.data.data[0].thumbnail,
                uploader: "User",
                duration: "HD",
                platform: "Instagram",
                download_url: fi.data.data[0].url
            });
        }
    } catch (err) {
        res.status(500).json({ error: "Video tapılmadı" });
    }
});

// 3. VİDEONU MƏCBURİ YÜKLƏDƏN HİSSƏ (Əsas düzəliş burada)
app.get('/api/download-video', async (req, res) => {
    const videoUrl = req.query.url;
    const title = req.query.title || "video";

    if (!videoUrl) return res.status(400).send("URL yoxdur");

    try {
        // Videonu uzaq serverdən axın (stream) kimi alırıq
        const response = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // Brauzerə məcburi yükləmə başlıqları göndəririk
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');

        // Videonu istifadəçiyə ötürürük
        response.data.pipe(res);
    } catch (e) {
        // Əgər böyük fayldırsa və ya xəta olsa, son çarə olaraq yönləndiririk
        res.redirect(videoUrl);
    }
});

module.exports = app;
