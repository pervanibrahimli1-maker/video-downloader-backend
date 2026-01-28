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

    // TikTok və Instagram bloklarını keçmək üçün təkmilləşdirilmiş komanda
    // --user-agent və --add-header çox vacibdir
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    
    // Əgər cookies.txt dolu olarsa, komandaya --cookies cookies.txt əlavə edə bilərsiniz
    const command = `yt-dlp -g -f "best" \
        --no-check-certificates \
        --user-agent "${userAgent}" \
        --add-header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8" \
        --add-header "Accept-Language:en-US,en;q=0.9" \
        "${url}"`;

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

// Portu 8000 olaraq qeyd etdik (Dockerfile-dakı EXPOSE ilə eyni olmalıdır)
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
