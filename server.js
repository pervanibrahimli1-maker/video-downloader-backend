const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

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
    origin: '*', // İstehsalda bunu dəyiş
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Video Yükləyici Backend API işləyir!');
});

// Yükləmələr üçün statik fayllar qovluğu
app.use('/downloads', express.static(DOWNLOADS_DIR));

app.post('/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ success: false, message: 'Video URL-i daxil edilməyib.' });
    }

    console.log(`Yükləmə sorğusu alındı: ${url}`);

    const isValid = (url) => {
        try {
            const parsedUrl = new URL(url);
            return (parsedUrl.hostname.includes('instagram.com') || parsedUrl.hostname.includes('tiktok.com') ||
                    parsedUrl.hostname.includes('www.instagram.com') || parsedUrl.hostname.includes('www.tiktok.com'));
        } catch (e) {
            return false;
        }
    };

    if (!isValid(url)) {
        return res.status(400).json({ success: false, message: 'Daxil etdiyiniz URL etibarlı deyil. Instagram və ya TikTok linki olduğundan əmin olun.' });
    }

    const videoFileName = `video-${Date.now()}.mp4`;
    const outputPath = path.join(DOWNLOADS_DIR, videoFileName);

    try {
        const command = `yt-dlp --force-overwrites --no-warnings --quiet -o "${outputPath}" "${url}"`;
        console.log(`Executing command: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`yt-dlp error: ${error.message}`);
                return res.status(500).json({ success: false, message: `Video yüklənərkən xəta baş verdi: ${error.message}` });
            }
            if (stderr) {
                console.warn(`yt-dlp stderr: ${stderr}`);
            }

            console.log(`yt-dlp stdout: ${stdout}`);
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
        });

    } catch (error) {
        console.error('Video emal edilərkən xəta baş verdi:', error);
        res.status(500).json({ success: false, message: 'Video yüklənərkən daxili server xətası baş verdi.', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
});

// ✅ 2 dəqiqədən sonra faylı silmək (opsional)
setTimeout(() => {
    if (fs.existsSync(outputPath)) {
        fs.unlink(outputPath, () => {});
    }
}, 120000);
