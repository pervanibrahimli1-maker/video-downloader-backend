const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Sənin RapidAPI Açarın
const RAPIDAPI_KEY = '46e0a3a349msh2cedb9359c05d12p118f8djsnee3a38d4c958';

app.post('/download', async (req, res) => {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "Link daxil edin" });

    try {
        // --- İNSTAGRAM ÜÇÜN ---
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
            const data = response.data;

            // API-dən gələn cavabı (download_url) front-end-ə göndəririk
            return res.json({
                title: "Instagram Video",
                thumbnail: data.thumbnail || "",
                url: data.download_url || data.url || data.link, 
                source: "instagram"
            });
        } 

        // --- TİKTOK ÜÇÜN ---
        else if (url.includes('tiktok.com')) {
            const options = {
                method: 'GET',
                url: 'https://tiktok-video-downloader-api.p.rapidapi.com/v1/video',
                params: { url: url },
                headers: {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': 'tiktok-video-downloader-api.p.rapidapi.com'
                }
            };

            const response = await axios.request(options);
            const data = response.data;

            // TikTok API adətən məlumatları 'data' obyektində qaytarır
            return res.json({
                title: data.data?.title || "TikTok Video",
                thumbnail: data.data?.cover || "",
                url: data.data?.play || data.data?.download_addr || data.url,
                source: "tiktok"
            });
        } 

        else {
            return res.status(400).json({ error: "Yalnız Instagram və TikTok linkləri dəstəklənir." });
        }

    } catch (error) {
        console.error('API Xətası:', error.response ? error.response.data : error.message);
        
        // Əgər API 403 xətası verirsə, deməli RapidAPI-də "Subscribe" (Abunə) olmamısan
        if (error.response && error.response.status === 403) {
            return res.status(500).json({ error: "API girişi rədd edildi. Zəhmət olmasa RapidAPI saytında hər iki API üçün 'Free Plan'-a abunə olun." });
        }

        res.status(500).json({ 
            error: "Video məlumatları alınarkən xəta baş verdi. Linkin düzgünlüyünü yoxlayın." 
        });
    }
});

// Ana səhifə testi
app.get('/', (req, res) => res.send('Video Downloader API Bridge is Active!'));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
