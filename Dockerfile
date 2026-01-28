FROM node:22-bookworm-slim 

# Sistem paketlərini və Python/FFmpeg quraşdırırıq
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp-ni pip vasitəsilə ən son versiyada quraşdırırıq
RUN python3 -m pip install --no-cache-dir --break-system-packages -U yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Portu 8000-də sabitləyirik
EXPOSE 8000

CMD ["node", "server.js"]
