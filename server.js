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
                // Endpoint düzəldildi: Bu API-də yol adətən birbaşa kök qovluqdur
                url: 'https://tiktok-video-downloader-api.p.rapidapi.com/', 
                params: { url: url },
                headers: {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': 'tiktok-video-downloader-api.p.rapidapi.com'
                }
            };
            const response = await axios.request(options);
            const data = response.data;

            // TikTok API fərqli cavablar verə bilər, ona görə bir neçə variantı yoxlayırıq
            const videoUrl = data.data?.play || data.data?.download_addr || data.video || data.url;

            return res.json({
                title: data.data?.title || "TikTok Video",
                thumbnail: data.data?.cover || "",
                url: videoUrl,
                source: "tiktok"
            });
        }
    } catch (error) {
        // Xətanı daha aydın görmək üçün
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('API Xətası:', errorMsg);
        
        if (errorMsg.includes('not subscribed')) {
            return res.status(500).json({ error: "API-yə abunə olmamısınız! RapidAPI saytından Free Plan-ı seçin." });
        }
        
        res.status(500).json({ error: "Video tapılmadı və ya API xətası baş verdi." });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
