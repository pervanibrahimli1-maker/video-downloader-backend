const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const RAPIDAPI_KEY = '46e0a3a349msh2cedb9359c05d12p118f8djsnee3a38d4c958';

app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Link daxil edin" });

    try {
        // --- İNSTAGRAM ---
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
            
            // Əgər Instagram hələ də təmirdədirsə
            if (response.data.success === false || response.data.message?.includes('upgrade')) {
                return res.status(503).json({ error: "İnstagram API təmirdədir, başqa API-yə keçməlisiniz." });
            }

            return res.json({
                title: "Instagram Video",
                url: response.data.download_url || response.data.url,
                source: "instagram"
            });
        } 

        // --- TİKTOK ---
        else if (url.includes('tiktok.com')) {
            const options = {
                method: 'GET',
                // Endpoint /v1/video olaraq dəyişdirildi (Düzgün yol çox vaxt budur)
                url: 'https://tiktok-video-downloader-api.p.rapidapi.com/v1/video', 
                params: { url: url },
                headers: {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': 'tiktok-video-downloader-api.p.rapidapi.com'
                }
            };
            const response = await axios.request(options);
            const data = response.data;

            // TikTok məlumat formatı API-dən API-yə dəyişir, bir neçə variantı yoxlayırıq:
            const videoUrl = data.data?.play || data.data?.download_addr || data.url;

            if (!videoUrl) {
                return res.status(404).json({ error: "TikTok videosu tapılmadı. API cavabını yoxlayın." });
            }

            return res.json({
                title: data.data?.title || "TikTok Video",
                url: videoUrl,
                source: "tiktok"
            });
        }
    } catch (error) {
        console.error('API Xətası:', error.response?.data || error.message);
        const msg = error.response?.data?.message || "";
        
        if (msg.includes("Endpoint")) {
            return res.status(404).json({ error: "API yolu (Endpoint) tapılmadı. RapidAPI-də düzgün endpoint-i seçin." });
        }
        
        res.status(500).json({ error: "Sistem xətası və ya API yenilənməsi." });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
