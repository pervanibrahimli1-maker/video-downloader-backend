FROM node:22-bookworm-slim 

# TikTok impersonation üçün lazım olan sistem kitabxanaları
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-full \
    ffmpeg \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp-ni bütün networking modulları ilə quraşdırırıq
RUN pip install --no-cache-dir --break-system-packages -U "yt-dlp[standard]"

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8000 
CMD ["node", "server.js"]
