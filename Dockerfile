# Əsas Docker şəkli (Node.js və Ubuntu bazalı)
FROM node:22-bookworm-slim 

# Sistem yeniləmələri edin və yt-dlp üçün Python-u quraşdırın
# yt-dlp üçün pip-i quraşdırın
# yt-dlp-i quraşdırın
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
    && pip install yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# İş qovluğunu təyin edin
WORKDIR /app

# package.json və package-lock.json fayllarını kopyalayın və asılılıqları quraşdırın
COPY package*.json ./
# Əgər layihənizdə `yarn` istifadə edirsinizsə, aşağıdakı sətri istifadə edin:
RUN npm install
# Əks halda, `npm` istifadə edin:
# RUN npm install

# Bütün digər layihə fayllarını kopyalayın
COPY . .

# Serveri dinləyən portu açıq elan edin
EXPOSE 5000 

# Tətbiqi işə salmaq üçün əmr
CMD ["node", "server.js"]
