const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is up and running!');
});

// VİDEO MƏLUMATLARINI GƏTİRMƏK
app.get('/info', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL lazımdır" });

    // -j ilə məlumatları alırıq
    const command = `yt-dlp -j --no-check-certificates "${videoUrl}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: "Video tapılmadı" });
        }
        try {
            const data = JSON.parse(stdout);
            res.json({
                title: data.title || "Video",
                thumbnail: data.thumbnail || "",
                description: data.description ? data.description.substring(0, 100) : ""
            });
        } catch (e) {
            res.status(500).json({ error: "Məlumat oxunmadı" });
        }
    });
});

// VİDEONU YÜKLƏMƏK (ƏSAS HİSSƏ)
app.get('/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("URL lazımdır");

    // Fayl başlıqları
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    res.setHeader('Content-Type', 'video/mp4');

    // DİQQƏT: Burada yalnız '-f best' istifadə edirik. 
    // Bu, səs və videonun artıq BİRLƏŞMİŞ olduğu ən yaxşı tək faylı götürür.
    const ytDlp = spawn('yt-dlp', [
        '-f', 'best', 
        '--no-check-certificates',
        '--add-header', 'Referer:https://www.tiktok.com/',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-o', '-', 
        videoUrl
    ]);

    ytDlp.stdout.pipe(res);

    ytDlp.stderr.on('data', (data) => {
        console.log(`yt-dlp log: ${data}`);
    });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`Xəta kodu: ${code}`);
            if (!res.headersSent) res.status(500).send("Yükləmə xətası");
        }
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir`));
