# Əsas Docker şəkli (Node.js və Ubuntu bazalı)
# Node.js 22 versiyasını Bookworm (Debian 12) slim bazası ilə istifadə edin
FROM node:22-bookworm-slim 

# Sistem yeniləmələri edin və yt-dlp üçün lazım olanları quraşdırın
# python3 və python3-pip apt-get ilə quraşdırılır
# yt-dlp pip ilə quraşdırılır, sistem paketlərinə toxunmaq üçün --break-system-packages flagı əlavə olunub
# Cache-ləri təmizləyin
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
    && pip install --break-system-packages yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# İş qovluğunu təyin edin
WORKDIR /app

# package.json və package-lock.json fayllarını kopyalayın və asılılıqları quraşdırın
# Bu addım build cache-dən səmərəli istifadə etmək üçün ayrıdır
COPY package*.json ./
# Əgər layihənizdə `yarn` istifadə edirsinizsə, aşağıdakı sətri istifadə edin:
# RUN yarn install
# Əks halda, `npm` istifadə edin (bu daha çox yayılmışdır):
RUN npm install

# Bütün digər layihə fayllarını (server.js, downloads qovluğu və s.) kopyalayın
COPY . .

# Serveri dinləyən portu açıq elan edin
EXPOSE 5000 

# Tətbiqi işə salmaq üçün əmr
CMD ["node", "server.js"]
