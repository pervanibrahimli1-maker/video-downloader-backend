const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Backend is running perfectly!');
});

app.get('/info', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: "URL is required" });

    const command = `yt-dlp -j --no-check-certificates "${videoUrl}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: "Video not found" });
        }
        try {
            const data = JSON.parse(stdout);
            res.json({
                title: data.title || "Video",
                thumbnail: data.thumbnail || "",
                description: data.description ? data.description.substring(0, 100) : ""
            });
        } catch (e) {
            res.status(500).json({ error: "Parse error" });
        }
    });
});

app.get('/download-video', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("URL is required");

    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    res.setHeader('Content-Type', 'application/octet-stream');

    const ytDlp = spawn('yt-dlp', [
        '-f', 'bv+ba/b',
        '--no-check-certificates',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-o', '-',
        videoUrl
    ]);

    ytDlp.stdout.pipe(res);

    ytDlp.stderr.on('data', (data) => {
        console.log(`Log: ${data}`);
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server is active on port ${PORT}`));
