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
    const isTikTok = url.includes('tiktok.com');

    const cookiePath = './cookies.txt';
    let cookieParam = '';
    if (fs.existsSync(cookiePath) && !isTikTok) {
        cookieParam = `--cookies ${cookiePath}`;
    }

    // TikTok üçün --impersonate-browser və fərqli başlıqlar
    const command = `yt-dlp -j --no-check-certificate \
        ${cookieParam} \
        --force-ipv4 \
        --geo-bypass \
        --impersonate-browser chrome \
        --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" \
        "${url}"`;

    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
            console.error('Xəta Detalları:', stderr);
            
            if (isTikTok) {
                return res.status(500).json({ error: "TikTok bu serverin (Render) IP ünvanını bloklayıb. Başqa hosting (Koyeb və ya Railway) istifadə etməlisiniz." });
            } else {
                return res.status(500).json({ error: "Instagram girişi blokladı. Cookies faylını yeniləmək və ya təmiz IP istifadə etmək lazımdır." });
            }
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
            res.status(500).json({ error: "Məlumat oxunarkən xəta baş verdi." });
        }
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
