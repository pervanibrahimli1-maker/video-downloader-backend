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
            const data = response.data;
            
            // Əgər API upgrade-dədirsə və ya boş cavab verirsə
            if (data.message && data.message.includes('upgrade')) {
                return res.status(503).json({ error: "Instagram API-də hal-hazırda yenilənmə gedir. Bir az sonra yoxlayın." });
            }

            return res.json({
                title: "Instagram Video",
                thumbnail: data.thumbnail || "",
                url: data.download_url || data.url || data.link,
                source: "instagram"
            });
        } 

        // --- TİKTOK ---
        else if (url.includes('tiktok.com')) {
            const options = {
                method: 'GET',
                // TikTok üçün endpoint /video olaraq dəyişdirildi
                url: 'https://tiktok-video-downloader-api.p.rapidapi.com/video', 
                params: { url: url },
                headers: {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': 'tiktok-video-downloader-api.p.rapidapi.com'
                }
            };
            const response = await axios.request(options);
            const data = response.data;

            // TikTok API-dən gələn cavabı analiz edirik
            const videoUrl = data.data?.play || data.data?.download_addr || data.url || data.video;

            if (!videoUrl) {
                return res.status(404).json({ error: "TikTok videosu tapılmadı. Linki yoxlayın." });
            }

            return res.json({
                title: data.data?.title || "TikTok Video",
                thumbnail: data.data?.cover || "",
                url: videoUrl,
                source: "tiktok"
            });
        }
    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error('API Xətası:', JSON.stringify(errorData));
        
        // Əgər endpoint yoxdursa, başqa bir variantı (v1/video) sınamaq olar
        res.status(500).json({ error: "Video tapılmadı və ya API xətası baş verdi. RapidAPI-də abunə olduğunuzdan əmin olun." });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
