const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(helmet());
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: { error: "Çox sayda istək göndərdiniz." }
});
app.use('/download', limiter);

const validateUrl = (url) => {
    const tiktokRegex = /^(https?:\/\/)?((vm|vt|v|www)\.)?tiktok\.com\/.*$/;
    const instaRegex = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reels|reel|tv)\/.*$/;
    return tiktokRegex.test(url) || instaRegex.test(url);
};

app.post('/download', (req, res) => {
    const { url } = req.body;

    if (!url || !validateUrl(url)) {
        return res.status(400).json({ error: "Etibarsız link!" });
    }

    // DÜZƏLİŞLƏR BURADADIR:
    // 1. --no-check-certificate (Tərcümə edilməməlidir)
    // 2. --user-agent (Instagram blokunu keçmək üçün brauzer kimi görünmək)
    // 3. --add-header (Əlavə təhlükəsizlik)
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const command = `yt-dlp -j --no-check-certificate --user-agent "${userAgent}" --add-header "Accept-Language:en-US,en;q=0.9" "${url}"`;

    exec(command, { timeout: 40000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Xəta detalları: ${stderr}`);
            return res.status(500).json({ 
                error: "Instagram/TikTok girişi blokladı. Bir az sonra yenidən yoxlayın və ya linkin açıq olduğundan əmin olun." 
            });
        }

        try {
            const videoData = JSON.parse(stdout);
            res.json({
                title: videoData.title,
                thumbnail: videoData.thumbnail,
                url: videoData.url,
                source: videoData.extractor
            });
        } catch (parseError) {
            res.status(500).json({ error: "Məlumat oxuna bilmədi." });
        }
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
