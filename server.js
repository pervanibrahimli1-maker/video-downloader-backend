const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/download', (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: "Link daxil edin" });

    // Linki təmizləmək
    url = url.split('?')[0];

    // Ən aqressiv komanda:
    // --force-ipv4: Render-in IPv6-sı blok ola bilər, IPv4 sınayırıq
    // --geo-bypass: Coğrafi blokları keçmək üçün
    // --impersonate-browser: Brauzer kimi görünmək
    const command = `yt-dlp -j --no-check-certificate \
        --force-ipv4 \
        --no-cache-dir \
        --geo-bypass \
        --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
        --add-header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" \
        --add-header "Accept-Language:en-US,en;q=0.5" \
        "${url}"`;

    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
            console.error('Xəta Detalları:', stderr);
            return res.status(500).json({ 
                error: "Platforma girişi blokladı. Render-in IP-si bloklanıb. Bir az gözləyib yenidən yoxlayın." 
            });
        }

        try {
            const data = JSON.parse(stdout);
            res.json({
                title: data.title,
                thumbnail: data.thumbnail,
                url: data.url,
                source: data.extractor
            });
        } catch (e) {
            res.status(500).json({ error: "Məlumat emal edilə bilmədi." });
        }
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server ${PORT} portunda aktivdir.`));
