FROM node:22-bookworm-slim 

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --break-system-packages -U yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm install
# Bütün faylları (cookies.txt daxil) kopyalayırıq
COPY . . 
EXPOSE 5000 
CMD ["node", "server.js"]
