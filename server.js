const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');

const app = express();

// 1. Təhlükəsizlik Header-ləri (Haker hücumlarından qorunmaq üçün)
app.use(helmet());

// 2. Render/Proxy dəstəyi (IP-ni düzgün tanımaq üçün)
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// 3. Rate Limit (Hər IP üçün 15 dəqiqədə max 100 istək)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Çox sayda istək göndərdiniz. Zəhmət olmasa 15 dəqiqə gözləyin." }
});
app.use('/download', limiter);

// 4. Genişləndirilmiş Regex (TikTok: vm, vt, v, www dəstəyi)
const validateUrl = (url) => {
    const tiktokRegex = /^(https?:\/\/)?((vm|vt|v|www)\.)?tiktok\.com\/.*$/;
    const instaRegex = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reels|reel|tv)\/.*$/;
    return tiktokRegex.test(url) || instaRegex.test(url);
};

app.post('/download', (req, res) => {
    const { url } = req.body;

    if (!url || !validateUrl(url)) {
        return res.status(400).json({ error: "Etibarsız link! TikTok və ya Instagram linki daxil edin." });
    }

    // 5. yt-dlp komandası (Timeout: 30 saniyə əlavə edildi)
    // Bu, serverin sonsuza qədər asılı qalmasının qarşısını alır
    const command = `yt-dlp -j --no-check-certificate "${url}"`;

    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Xəta: ${error.message}`);
            if (error.killed) {
                return res.status(500).json({ error: "Sorğu çox uzun çəkdi (Timeout)." });
            }
            return res.status(500).json({ error: "Video məlumatı tapılmadı. Linkin gizli olmadığından əmin olun." });
        }

        try {
            const videoData = JSON.parse(stdout);
            res.json({
                title: videoData.title || "Video",
                thumbnail: videoData.thumbnail,
                url: videoData.url,
                duration: videoData.duration_string,
                source: videoData.extractor
            });
        } catch (parseError) {
            res.status(500).json({ error: "Məlumat emal edilə bilmədi." });
        }
    });
});

// Test üçün ana səhifə
app.get('/', (req, res) => {
    res.send('Backend Status: Active');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda aktivdir.`);
});
