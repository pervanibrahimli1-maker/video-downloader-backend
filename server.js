const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Backend aktivdir! Videonu yükləmək üçün /download-video istifadə edin.');
});

// BU ƏSAS FUNKSİYADIR: Videonu server üzərindən ötürür
app.get('/download-video', (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).send("Video linki lazımdır.");
    }

    console.log("Yüklənilir:", videoUrl);

    // Brauzerə fayl kimi yüklənməsini tapşırırıq
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    res.setHeader('Content-Type', 'video/mp4');

    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    // yt-dlp ilə videonu birbaşa stdout-a (axına) çıxarırıq
    const ytDlp = spawn('yt-dlp', [
        '-f', 'bestvideo+bestaudio/best',
        '--no-check-certificates',
        '--user-agent', userAgent,
        '-o', '-', // Videonu fayla yox, birbaşa çıxışa (stream) ver
        videoUrl
    ]);

    // Videonu hissə-hissə istifadəçiyə göndər
    ytDlp.stdout.pipe(res);

    ytDlp.stderr.on('data', (data) => {
        console.error(`Log: ${data}`);
    });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp xəta ilə bitdi: ${code}`);
            if (!res.headersSent) {
                res.status(500).send("Video yüklənərkən xəta baş verdi.");
            }
        }
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda PROXY rejimində işləyir.`));
