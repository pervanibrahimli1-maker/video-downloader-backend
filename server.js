const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json());

// 1. "Arxa-arxaya çox istifadə" xətasının həlli (Limit artırıldı)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dəqiqə
    max: 200, // 15 dəqiqədə 200 istəyə icazə verilir
    message: { error: "Çox sayda istək göndərdiniz. Zəhmət olmasa bir az gözləyin." }
});
app.use('/download', limiter);

// 2. TikTok və Instagram linklərini yoxlayan mükəmməl Regex
const validateUrl = (url) => {
    const tiktokRegex = /^(https?:\/\/)?((vm|vt|v|www)\.)?tiktok\.com\/.*$/;
    const instaRegex = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reels|reel|tv)\/.*$/;
    return tiktokRegex.test(url) || instaRegex.test(url);
};

app.post('/download', async (req, res) => {
    const { url } = req.body;

    if (!url || !validateUrl(url)) {
        return res.status(400).json({ error: "Etibarsız link! TikTok və ya Instagram linki daxil edin." });
    }

    // yt-dlp vasitəsilə videonun məlumatlarını alırıq
    // -j: JSON formatında məlumat qaytarır
    // -g: Birbaşa video linkini çıxarır
    const command = `yt-dlp -j --no-check-certificate "${url}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Xəta: ${error.message}`);
            return res.status(500).json({ error: "Video məlumatları alınarkən xəta baş verdi." });
        }

        try {
            const videoData = JSON.parse(stdout);
            res.json({
                title: videoData.title,
                thumbnail: videoData.thumbnail,
                url: videoData.url, // Birbaşa video linki
                duration: videoData.duration_string,
                source: videoData.extractor
            });
        } catch (parseError) {
            res.status(500).json({ error: "Məlumat oxunarkən xəta: " + parseError.message });
        }
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda işləyir...`);
});
