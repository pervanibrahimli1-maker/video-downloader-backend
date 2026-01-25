const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/download', (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: "Link daxil edin" });

    url = url.split('?')[0];

    // Cookies faylının olub-olmadığını yoxlayırıq
    const cookiePath = './cookies.txt';
    let cookieParam = '';
    if (fs.existsSync(cookiePath)) {
        cookieParam = `--cookies ${cookiePath}`;
    }

    // Ən güclü Bypass komandası + Cookies
    const command = `yt-dlp -j --no-check-certificate \
        ${cookieParam} \
        --force-ipv4 \
        --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" \
        "${url}"`;

    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
            console.error('Xəta Detalları:', stderr);
            return res.status(500).json({ 
                error: "Instagram hələ də girişi bloklayır. Cookies faylını yeniləmək lazım ola bilər." 
            });
        }

        try {
            const data = JSON.parse(stdout);
            res.json({
                title: data.title || "Video",
                thumbnail: data.thumbnail,
                url: data.url,
                source: data.extractor
            });
        } catch (e) {
            res.status(500).json({ error: "Məlumat oxuna bilmədi." });
        }
    });
});

app.get('/', (req, res) => res.send('Backend with Cookies is active!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
