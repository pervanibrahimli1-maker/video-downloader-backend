const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const RAPIDAPI_KEY = '46e0a3a349msh2cedb9359c05d12p118f8djsnee3a38d4c958';

// Əsas yoxlama yolu (Brauzerdə açanda görünməlidir)
app.get('/', (req, res) => {
    res.send('Backend Server 8000 portunda işləyir və hazırdır!');
});

// Download yolu
app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Link daxil edin" });

    try {
        if (url.includes('instagram.com')) {
            const options = {
                method: 'GET',
                url: 'https://instagram-reels-downloader-api.p.rapidapi.com/download',
                params: { url: url },
                headers: {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': 'instagram-reels-downloader-api.p.rapidapi.com'
                }
            };
            const response = await axios.request(options);
            return res.json({
                title: "Instagram Video",
                url: response.data.download_url || response.data.url || response.data.link,
                source: "instagram"
            });
        } 
        else if (url.includes('tiktok.com')) {
            const options = {
                method: 'GET',
                // TikTok üçün alternativ bir endpoint sınayırıq
                url: 'https://tiktok-video-downloader-api.p.rapidapi.com/v1/video', 
                params: { url: url },
                headers: {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': 'tiktok-video-downloader-api.p.rapidapi.com'
                }
            };
            const response = await axios.request(options);
            const data = response.data;
            const videoUrl = data.data?.play || data.data?.download_addr || data.url;

            if (!videoUrl) throw new Error("Video linki tapılmadı");

            return res.json({
                title: data.data?.title || "TikTok Video",
                url: videoUrl,
                source: "tiktok"
            });
        }
    } catch (error) {
        console.error('API Xətası:', error.response?.data || error.message);
        res.status(500).json({ error: "Video tapılmadı. RapidAPI abunəliyinizi yoxlayın." });
    }
});

// Koyeb üçün dinamik port və ya 8000
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
