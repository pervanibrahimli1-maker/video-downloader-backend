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

    url = url.split('?')[0];
    const isInstagram = url.includes('instagram.com');

    const cookiePath = './cookies.txt';
    let cookieParam = '';

    // Instagram üçün cookies yoxla
    if (isInstagram && fs.existsSync(cookiePath)) {
        cookieParam = `--cookies ${cookiePath}`;
    }

    // TikTok və Instagram üçün ən müasir Bypass komandası
    // --client-certificate yox, --impersonate-browser istifadə edirik (Docker yeniləndi deyə işləyəcək)
    const command = `yt-dlp -j --no-check-certificate \
        ${cookieParam} \
        --force-ipv4 \
        --geo-bypass \
        --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" \
        "${url}"`;

    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
            console.error('Log Detalı:', stderr);
            return res.status(500).json({ 
                error: "Platforma girişi rədd etdi. Instagram üçün Cookies yenilənməli, TikTok üçün isə server IP-si dəyişməlidir." 
            });
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
            res.status(500).json({ error: "Məlumat oxuna bilmədi." });
        }
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
