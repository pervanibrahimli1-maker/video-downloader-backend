const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process'); 
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

const rateLimit = require('express-rate-limit');

// Rate Limiting konfiqurasiyası
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dəqiqə
    max: 10, // Hər IP-dən 15 dəqiqədə maksimum 10 sorğu
    message: 'Çoxlu sorğu göndərmisiniz, zəhmət olmasa bir qədər gözləyin.',
    standardHeaders: true, 
    legacyHeaders: false, 
});

// Yüklənmiş videolar üçün qovluğu runtime-da yarat
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
    origin: 'https://tt-instavideoindirme.free.nf', // Sizin FRONTEND domeniniz
}));

// ✅ Yeni: express.json() üçün limit təyin edin
// URL üçün 10MB çox böyükdür, lakin PayloadTooLargeError-un qarşısını almaq üçün adekvatdır.
// Real URL-lər adətən bir neçə KB-dan çox olmur.
app.use(express.json({ limit: '10mb' })); // Limit '10mb' (10 meqabayt) olaraq təyin edildi

app.get('/', (req, res) => {
    res.send('Video Yükləyici Backend API işləyir!');
});

// Yükləmələr üçün statik fayllar qovluğu
app.use('/downloads', express.static(DOWNLOADS_DIR));

// Rate limit-i download endpoint-ə tətbiq edin
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
            const hostname = parsedUrl.hostname.toLowerCase();
            const path = parsedUrl.pathname.toLowerCase();

            // Protokol yoxlaması
            if (!(parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:')) {
                return false;
            }

            // Daha sərt hostname və yol yoxlaması
            if (hostname.includes('instagram.com')) {
                return path.startsWith('/p/') || path.startsWith('/reel/');
            } else if (hostname.includes('tiktok.com')) {
                return path.startsWith('/video/');
            } else {
                return false; 
            }
        } catch (e) {
            console.error(`URL validation failed for ${inputUrl}:`, e);
            return false; 
        }
    };

    if (!isValid(url)) {
        console.error(`Download request failed: Invalid URL ${url}.`);
        return res.status(400).json({ success: false, message: 'Daxil etdiyiniz URL etibarlı deyil və ya dəstəklənmir. Yalnız Instagram (post/reel) və ya TikTok (video) linki olduğundan əmin olun.' });
    }

    // Video faylı üçün unikal ad
    const videoFileName = `video-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.mp4`;
    const outputPath = path.join(DOWNLOADS_DIR, videoFileName);

    const ytDlpArgs = [
        '--force-overwrites',
        '--no-warnings',
        '--quiet',
        '-o', outputPath,
        url
    ];

    const instagramCookies = process.env.INSTAGRAM_COOKIES;
    if (instagramCookies) {
        ytDlpArgs.unshift('--add-header', `Cookie: ${instagramCookies}`);
    }

    const DOWNLOAD_TIMEOUT = 120 * 1000; // 2 dəqiqə

    let stdoutBuffer = '';
    let stderrBuffer = '';

    try {
        console.log(`Spawning yt-dlp with arguments: ${JSON.stringify(ytDlpArgs)}`);
        const ytDlpProcess = spawn('yt-dlp', ytDlpArgs, { timeout: DOWNLOAD_TIMEOUT });

        ytDlpProcess.stdout.on('data', (data) => {
            stdoutBuffer += data.toString();
        });

        ytDlpProcess.stderr.on('data', (data) => {
            stderrBuffer += data.toString();
        });

        ytDlpProcess.on('close', (code, signal) => {
            if (signal === 'SIGTERM') { 
                console.error(`yt-dlp process timed out and was killed for URL: ${url}.`);
                if (fs.existsSync(outputPath)) {
                    fs.unlink(outputPath, (unlinkErr) => {
                        if (unlinkErr) console.error(`Failed to delete partial file ${outputPath}:`, unlinkErr);
                    });
                }
                return res.status(500).json({ success: false, message: 'Video yüklənməsi vaxtı bitdi. Zəhmət olmasa, daha qısa video ilə cəhd edin.' });
            }

            if (code !== 0) {
                console.error(`yt-dlp process exited with code ${code} for URL: ${url}`);
                console.error(`yt-dlp stderr: ${stderrBuffer}`);
                
                let clientMessage = `Video yüklənərkən xəta baş verdi. Zəhmət olmasa, URL-in düzgünlüyünü yoxlayın.`;
                if (stderrBuffer.includes('HTTP Error 429') || stderrBuffer.includes('rate-limit reached')) {
                    clientMessage = 'Sorğu limiti aşıldı. Zəhmət olmasa, bir müddət sonra yenidən cəhd edin.';
                } else if (stderrBuffer.includes('login required') || stderrBuffer.includes('content is not available')) {
                    clientMessage = 'Video əlçatan deyil, ya da giriş tələb olunur.';
                } else if (stderrBuffer.includes('Unsupported URL') || stderrBuffer.includes('Unable to extract data')) {
                    clientMessage = 'Daxil etdiyiniz URL dəstəklənmir və ya video tapılmadı. Yalnız Instagram (post/reel) və TikTok (video) dəstəklənir.';
                }
                
                if (fs.existsSync(outputPath)) {
                    fs.unlink(outputPath, (unlinkErr) => {
                        if (unlinkErr) console.error(`Failed to delete partial file ${outputPath}:`, unlinkErr);
                    });
                }
                return res.status(500).json({ success: false, message: clientMessage });
            }

            console.log(`yt-dlp stdout: ${stdoutBuffer}`);
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

            const CLEANUP_DELAY = 10 * 60 * 1000; // 10 dəqiqə
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

        ytDlpProcess.on('error', (err) => {
            console.error(`Failed to start yt-dlp process: ${err.message}`);
            if (fs.existsSync(outputPath)) {
                fs.unlink(outputPath, (unlinkErr) => {
                    if (unlinkErr) console.error(`Failed to delete partial file ${outputPath}:`, unlinkErr);
                });
            }
            return res.status(500).json({ success: false, message: 'Server daxili xəta: Yükləmə prosesi başlaya bilmədi.' });
        });

    } catch (error) {
        console.error('Video emal edilərkən daxili server xətası baş verdi:', error);
        res.status(500).json({ success: false, message: 'Video yüklənərkən daxili server xətası baş verdi.', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
});
