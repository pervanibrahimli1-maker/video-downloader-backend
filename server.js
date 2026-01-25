const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

app.post('/download', (req, res) => {
    let { url } = req.body;

    if (!url) return res.status(400).json({ error: "Link daxil edin" });

    // 1. Linki təmizləmək (Sual işarəsindən sonrakı izləmə kodlarını silirik)
    url = url.split('?')[0];

    // 2. Çox güclü User-Agent və Instagram-ı aldatmaq üçün parametrlər
    // --force-overwrites və --no-playlist əlavə edildi
    const command = `yt-dlp -j --no-check-certificate \
        --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1" \
        --add-header "Referer:https://www.instagram.com/" \
        --add-header "Accept-Language:en-US,en;q=0.9" \
        "${url}"`;

    exec(command, { timeout: 40000 }, (error, stdout, stderr) => {
        if (error) {
            console.error('Xəta:', stderr);
            // Əgər Instagram yenə bloklasa, istifadəçiyə daha aydın mesaj verək
            return res.status(500).json({ 
                error: "Instagram bu serverin girişini müvəqqəti bloklayıb. Zəhmət olmasa 5-10 dəqiqə sonra yenidən yoxlayın və ya başqa link sınayın." 
            });
        }

        try {
            const data = JSON.parse(stdout);
            res.json({
                title: data.title,
                thumbnail: data.thumbnail,
                url: data.url,
                source: data.extractor
            });
        } catch (e) {
            res.status(500).json({ error: "Məlumat emal edilə bilmədi." });
        }
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
