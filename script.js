document.addEventListener('DOMContentLoaded', () => {
    const videoUrlInput = document.getElementById('videoUrl');
    const downloadButton = document.getElementById('downloadButton');
    const statusMessage = document.getElementById('statusMessage');
    const downloadResult = document.getElementById('downloadResult');

    const BASE_URL = window.location.origin + '/api';

    downloadButton.addEventListener('click', async () => {
        const url = videoUrlInput.value.trim();
        if (!url) return alert("Linki daxil edin!");

        statusMessage.innerHTML = '<span class="loading"><i class="fas fa-spinner fa-spin"></i> Məlumatlar alınır...</span>';
        downloadResult.innerHTML = '';
        downloadButton.disabled = true;

        try {
            const response = await fetch(`${BASE_URL}/info?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error("Video məlumatları alınmadı.");

            const data = await response.json();
            
            // Şəkli proxy vasitəsilə göstəririk
            const proxiedThumb = data.thumbnail ? `${BASE_URL}/proxy-image?url=${encodeURIComponent(data.thumbnail)}` : "";
            
            statusMessage.innerHTML = '<span style="color: #00f2fe;">Uğurlu!</span>';

            downloadResult.innerHTML = `
                <div class="result-card">
                    <div class="card-preview">
                        <img src="${proxiedThumb}" alt="Video Thumbnail" onerror="this.src='https://via.placeholder.com/400x250?text=Video+Hazirdir'">
                        <span class="badge">${data.duration}</span>
                    </div>
                    <div class="card-info">
                        <h3>${data.title}</h3>
                        <p class="card-desc">${data.description}</p>

                        <div class="user-tag">
                            <div class="avatar">${data.uploader.charAt(0).toUpperCase()}</div>
                            <div class="username">
                                <div>@${data.uploader}</div>
                                <div style="font-size: 0.7rem; color: #888;">${data.platform}</div>
                            </div>
                        </div>
                        <a href="${data.download_url}" target="_blank" download="video.mp4" class="final-dl-btn">
                            <i class="fas fa-cloud-download-alt"></i> VİDEONU YÜKLƏ (.MP4)
                        </a>
                        <p style="font-size: 0.7rem; color: #888; margin-top: 10px; text-align: center;">
                            *Əgər yükləmə başlamasa, videonun üzərində sağ klik edib "Save As" seçin.
                        </p>
                    </div>
                </div>
            `;
        } catch (error) {
            statusMessage.innerHTML = `<span style="color: #ff4b2b;">Xəta: ${error.message}</span>`;
        } finally {
            downloadButton.disabled = false;
        }
    });
});
