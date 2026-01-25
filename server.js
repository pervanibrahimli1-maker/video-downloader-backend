const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/download', (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: "Link daxil edin" });

    // Linki təmizlə
    url = url.split('?')[0];
    const isTikTok = url.includes('tiktok.com');

    const cookiePath = './cookies.txt';
    let cookieParam = '';
    
    // Yalnız Instagram üçün cookies istifadə et (TikTok-da bəzən xəta verir)
    if (fs.existsSync(cookiePath) && !isTikTok) {
        cookieParam = `--cookies ${cookiePath}`;
    }

    // --impersonate-browser SİLİNDİ (Xətaya səbəb olduğu üçün)
    // Əvəzinə standart --user-agent və --add-header qoyuldu
    const command = `yt-dlp -j --no-check-certificate \
        ${cookieParam} \
        --force-ipv4 \
        --geo-bypass \
        --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" \
        --add-header "Accept-Language: en-US,en;q=0.9" \
        "${url}"`;

    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
            console.error('Xəta Detalları:', stderr);
            
            if (stderr.includes('blocked') || stderr.includes('403') || stderr.includes('status code 0')) {
                return res.status(500).json({ error: "Platforma (TikTok/Instagram) bu serverin IP ünvanını bloklayıb. Render-də bu problemi həll etmək mümkün deyil." });
            }
            
            return res.status(500).json({ error: "Video yüklənə bilmədi. Linkin düzgünlüyünü yoxlayın." });
        }

        try {
            const data = JSON.parse(stdout);
            res.json({
                title: data.title || "Video",
                thumbnail: data.thumbnail,
                url: data.url,
                source: data.extractor
            });
        } catch (e) {
            res.status(500).json({ error: "Məlumat emal edilə bilmədi." });
        }
    });
});

app.get('/', (req, res) => res.send('Server is running...'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
