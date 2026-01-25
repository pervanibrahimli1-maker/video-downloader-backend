const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/downloads', express.static(DOWNLOADS_DIR));

app.get('/', (req, res) => {
    res.send('Video Yükləyici Backend API işləyir!');
});

app.post('/download', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'Video URL-i daxil edilməyib.' });

    const isValid = (url) => {
        try {
            const parsedUrl = new URL(url);
            return (parsedUrl.hostname.includes('instagram.com') || parsedUrl.hostname.includes('tiktok.com') ||
                    parsedUrl.hostname.includes('www.instagram.com') || parsedUrl.hostname.includes('www.tiktok.com'));
        } catch (e) { return false; }
    };
    if (!isValid(url)) return res.status(400).json({ success: false, message: 'Daxil etdiyiniz URL etibarlı deyil.' });

    const videoFileName = `video-${Date.now()}.mp4`;
    const outputPath = path.join(DOWNLOADS_DIR, videoFileName);

    const command = `yt-dlp --force-overwrites --no-warnings --quiet -o "${outputPath}" "${url}"`;
    console.log(`Executing: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ success: false, message: `Video yüklənərkən xəta: ${error.message}` });
        if (stderr) console.warn(`yt-dlp stderr: ${stderr}`);

        const downloadLink = `${req.protocol}://${req.get('host')}/downloads/${videoFileName}`;
        const thumbnail = `https://via.placeholder.com/400x250?text=Video+Thumbnail`;

        res.json({
            success: true,
            message: 'Video uğurla yüklənməyə hazırlandı!',
            downloadUrl: downloadLink,
            thumbnail: thumbnail,
            originalUrl: url
        });

        // 2 dəqiqədən sonra faylı sil
        setTimeout(() => {
            fs.unlink(outputPath, (err) => {
                if (err) console.error('Fayl silinərkən xəta:', err);
            });
        }, 120000);
    });
});

app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
});
