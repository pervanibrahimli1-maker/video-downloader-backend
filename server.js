document.addEventListener('DOMContentLoaded', () => {
    const videoUrlInput = document.getElementById('videoUrl');
    const downloadButton = document.getElementById('downloadButton');
    const statusMessage = document.getElementById('statusMessage');
    const downloadResult = document.getElementById('downloadResult');

    const BASE_URL = 'https://video-downloader-backend-4.onrender.com';

    downloadButton.addEventListener('click', async () => {
        const url = videoUrlInput.value.trim();
        
        if (!url) {
            statusMessage.textContent = 'Zəhmət olmasa bir link daxil edin.';
            statusMessage.className = 'status-message error';
            return;
        }

        // Təmizlik
        statusMessage.textContent = 'Video məlumatları hazırlanır... (10-15 saniyə çəkə bilər)';
        statusMessage.className = 'status-message loading';
        downloadResult.innerHTML = '';
        downloadButton.disabled = true;

        try {
            // 1. Məlumatları alırıq (Ad və Şəkil üçün)
            const infoResponse = await fetch(`${BASE_URL}/info?url=${encodeURIComponent(url)}`);
            
            if (!infoResponse.ok) throw new Error('Video tapılmadı və ya server xətası.');

            const data = await infoResponse.json();
            
            // 2. Yükləmə linkini hazırlayırıq
            const downloadLink = `${BASE_URL}/download-video?url=${encodeURIComponent(url)}`;
            
            statusMessage.textContent = 'Video tapıldı! Aşağıdakı düyməyə basaraq yükləyin.';
            statusMessage.className = 'status-message success';

            // 3. Ekranda nəticəni göstəririk
            downloadResult.innerHTML = `
                <div class="result-card" style="margin-top: 20px; padding: 20px; border: 1px solid #444; border-radius: 12px; background: rgba(255,255,255,0.05);">
                    <img src="${data.thumbnail}" alt="Önizləmə" style="width: 100%; max-width: 250px; border-radius: 8px;">
                    <h3 style="margin: 15px 0; font-size: 1.2rem;">${data.title}</h3>
                    <p style="font-size: 0.9rem; color: #ccc; margin-bottom: 20px;">Filiqransız MP4 formatında</p>
                    
                    <a href="${downloadLink}" class="download-link" style="
                        display: inline-block;
                        background: #e21d6e;
                        color: white;
                        padding: 12px 30px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(226, 29, 110, 0.4);
                    ">
                        <i class="fas fa-download"></i> VİDEONU YÜKLƏ
                    </a>
                </div>
            `;

        } catch (error) {
            console.error('Xəta:', error);
            statusMessage.textContent = 'Xəta: ' + error.message;
            statusMessage.className = 'status-message error';
        } finally {
            downloadButton.disabled = false;
        }
    });
});
