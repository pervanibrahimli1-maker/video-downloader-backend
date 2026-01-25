const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Yeni: Rate Limiting üçün paket
const rateLimit = require('express-rate-limit');
// ✅ Yeni: Command Injection-ın qarşısını almaq üçün paket
const shellEscape = require('shell-escape');

// ✅ Rate Limiting konfiqurasiyası
// Bir IP-dən 15 dəqiqə ərzində maksimum 10 sorğuya icazə verir.
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dəqiqə
    max: 10, // Hər IP-dən 15 dəqiqədə maksimum 10 sorğu
    message: 'Çoxlu sorğu göndərmisiniz, zəhmət olmasa bir qədər gözləyin.',
    standardHeaders: true, // Rate limit məlumatını HTTP başlığında qaytarır
    legacyHeaders: false, // Köhnə X-Rate-Limit-* başlıqlarını deaktiv edir
});

// ✅ Yüklənmiş videolar üçün qovluğu runtime-da yarat
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
try {
    if (!fs.existsSync(DOWNLOADS_DIR)) {
        fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
        console.log('downloads qovluğu yaradıldı.');
    }
} catch (err) {
    console.error('downloads qovluğu yaradılarkən xəta:', err);
}

// Middleware
app.use(cors({
    origin: 'https://tt-instavideoindirme.free.nf', // Buraya SİZİN FRONTEND domeninizi yazın.
    // Əgər gələcəkdə başqa domenlərə də icazə vermək istəyirsinizsə:
    // origin: ['https://tt-instavideoindirme.free.nf', 'https://bashqa-domen.com'],
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Video Yükləyici Backend API işləyir!');
});

// Yükləmələr üçün statik fayllar qovluğu
app.use('/downloads', express.static(DOWNLOADS_DIR));

// ✅ Rate limit-i download endpoint-ə tətbiq edin
app.post('/download', limiter, async (req, res) => {
    const { url } = req.body;

    if (!url) {
        console.error('Download request failed: No URL provided.');
        return res.status(400).json({ success: false, message: 'Video URL-i daxil edilməyib.' });
    }

    console.log(`Yükləmə sorğusu alındı: ${url}`);

    const isValid = (inputUrl) => {
        try {
            const parsedUrl = new URL(inputUrl);
            // http/https protokolunu və Instagram/TikTok domenlərini yoxlayın
            return (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && 
                   (parsedUrl.hostname.includes('instagram.com') || parsedUrl.hostname.includes('tiktok.com') ||
                    parsedUrl.hostname.includes('www.instagram.com') || parsedUrl.hostname.includes('www.tiktok.com'));
        } catch (e) {
            console.error(`URL validation failed for ${inputUrl}:`, e);
            return false;
        }
    };

    if (!isValid(url)) {
        console.error(`Download request failed: Invalid URL ${url}.`);
        return res.status(400).json({ success: false, message: 'Daxil etdiyiniz URL etibarlı deyil. Instagram və ya TikTok linki olduğundan əmin olun.' });
    }

    // ✅ Təhlükəsizlik: Command Injection-ın qarşısını almaq üçün URL və çıxış yolunu escape edin
    const escapedUrl = shellEscape([url]);
    
    // Video faylı üçün daha unikal ad, toqquşmaları azaltmaq üçün
    const videoFileName = `video-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.mp4`;
    const outputPath = path.join(DOWNLOADS_DIR, videoFileName);
    const escapedOutputPath = shellEscape([outputPath]); // Çıxış yolunu da escape edin

    const instagramCookies = process.env.INSTAGRAM_COOKIES;
    let ytDlpCommand = `yt-dlp --force-overwrites --no-warnings --quiet -o ${escapedOutputPath} ${escapedUrl}`;

    if (instagramCookies) {
        // Kuki dəyərindəki dırnaqları escape edin ki, shell əmri düzgün işləsin
        const escapedCookieValue = instagramCookies.replace(/"/g, '\\"'); 
        ytDlpCommand = `yt-dlp --add-header "Cookie: ${escapedCookieValue}" --force-overwrites --no-warnings --quiet -o ${escapedOutputPath} ${escapedUrl}`;
    }

    // ✅ Resursların istismarının qarşısını almaq üçün yt-dlp əməliyyatına timeout təyin edin
    const DOWNLOAD_TIMEOUT = 120 * 1000; // 2 dəqiqə (millisecond)

    try {
        console.log(`Executing command: ${ytDlpCommand}`);

        exec(ytDlpCommand, { timeout: DOWNLOAD_TIMEOUT }, (error, stdout, stderr) => {
            if (error) {
                console.error(`yt-dlp command failed for URL: ${url}. Error: ${error.message}`);
                
                // ✅ İstifadəçiyə daha informativ xəta mesajları verin
                let clientMessage = `Video yüklənərkən xəta baş verdi. Zəhmət olmasa, URL-in düzgünlüyünü yoxlayın.`;
                if (error.killed && error.signal === 'SIGTERM') {
                    clientMessage = 'Video yüklənməsi vaxtı bitdi. Zəhmət olmasa, daha qısa video ilə cəhd edin.';
                } else if (error.message.includes('HTTP Error 429') || error.message.includes('rate-limit reached')) {
                    clientMessage = 'Sorğu limiti aşıldı. Zəhmət olmasa, bir müddət sonra yenidən cəhd edin.';
                } else if (error.message.includes('login required') || error.message.includes('content is not available')) {
                    clientMessage = 'Video əlçatan deyil, ya da giriş tələb olunur.';
                } else if (error.message.includes('Unsupported URL')) {
                    clientMessage = 'Dəstəklənməyən URL növü. Yalnız Instagram və TikTok dəstəklənir.';
                }
                
                // ✅ Xəta baş verdikdə qismən endirilmiş faylı silin
                if (fs.existsSync(outputPath)) {
                    fs.unlink(outputPath, (unlinkErr) => {
                        if (unlinkErr) console.error(`Failed to delete partial file ${outputPath}:`, unlinkErr);
                    });
                }
                return res.status(500).json({ success: false, message: clientMessage });
            }
            if (stderr) {
                console.warn(`yt-dlp stderr for URL: ${url}: ${stderr}`);
            }

            console.log(`yt-dlp stdout for URL: ${url}: ${stdout}`);
            console.log(`Video uğurla endirildi: ${outputPath}`);

            const downloadLink = `${req.protocol}://${req.get('host')}/downloads/${videoFileName}`;
            const thumbnail = `https://via.placeholder.com/400x250?text=Video+Thumbnail`;

            res.json({
                success: true,
                message: 'Video uğurla yüklənməyə hazırlandı!',
                downloadUrl: downloadLink,
                thumbnail: thumbnail,
                originalUrl: url
            });

            // ✅ Faylı yükləndikdən sonra müəyyən bir müddət (10 dəqiqə) sonra silmək
            // İstifadəçiyə videonu yükləmək üçün vaxt vermək üçün gecikmə
            const CLEANUP_DELAY = 10 * 60 * 1000; // 10 dəqiqə (millisecond)
            setTimeout(() => {
                if (fs.existsSync(outputPath)) {
                    fs.unlink(outputPath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error(`Fayl silinərkən xəta: ${outputPath}`, unlinkErr);
                        } else {
                            console.log(`Köhnə fayl silindi: ${outputPath}`);
                        }
                    });
                }
            }, CLEANUP_DELAY);
        });

    } catch (error) {
        console.error('Video emal edilərkən daxili server xətası baş verdi:', error);
        res.status(500).json({ success: false, message: 'Video yüklənərkən daxili server xətası baş verdi.', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
});


//fgdng
