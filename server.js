const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Backend (yt-dlp) 8000 portunda aktivdir!');
});

app.post('/download', (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: "Zəhmət olmasa link daxil edin" });
    }

    // yt-dlp komandası: -g (linki gətir), -j (bütün məlumatları JSON kimi gətir)
    // Instagram və TikTok üçün bəzi xüsusi sazlamalar əlavə edirik
    const command = `yt-dlp -g -f "best" --no-check-certificates "${url}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Xəta: ${stderr}`);
            return res.status(500).json({ 
                error: "Video tapılmadı və ya sayt girişi blokladı.",
                details: stderr 
            });
        }

        const videoUrl = stdout.trim();
        
        if (!videoUrl) {
            return res.status(404).json({ error: "Video linki əldə edilə bilmədi." });
        }

        res.json({
            title: "Yüklənən Video",
            url: videoUrl,
            source: url.includes('tiktok') ? "tiktok" : "instagram"
        });
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda (API KEY-SİZ) işləyir.`));
