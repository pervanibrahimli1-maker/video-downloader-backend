const express = require('express');
const cors = require('cors');
const axios = require('axios'); // axios lazımdır: npm install axios

const app = express();
app.use(cors());
app.use(express.json());

app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Link daxil edin" });

    try {
        if (url.includes('tiktok.com')) {
            // TikTok üçün Bloklanmayan Pulsuz API Körpüsü
            const response = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`);
            const data = response.data;

            if (data.status === 200 || data.result) {
                return res.json({
                    title: data.result.title || "TikTok Video",
                    thumbnail: data.result.cover || "",
                    url: data.result.video.noWatermark || data.result.video.url, // Filqransız link
                    source: "tiktok"
                });
            }
        } 
        else if (url.includes('instagram.com')) {
            // Instagram üçün Körpü (Qeyd: Instagram çox sərtdir, bu API işləməsə RapidAPI lazımdır)
            // Hələlik ən stabil pulsuz metodlardan birini sınayırıq
            const response = await axios.get(`https://api.api-beauty.pro/api/instagram?url=${encodeURIComponent(url)}`);
            const data = response.data;

            if (data.status) {
                return res.json({
                    title: "Instagram Video",
                    thumbnail: data.result.thumbnail,
                    url: data.result.url,
                    source: "instagram"
                });
            }
        }

        throw new Error("Video tapılmadı");
    } catch (error) {
        console.error("API Xətası:", error.message);
        res.status(500).json({ error: "Platforma (IP) blokuna görə yükləmə alınmadı. Zəhmət olmasa başqa link yoxlayın." });
    }
});

app.get('/', (req, res) => res.send('API Bridge is Online!'));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
