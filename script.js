document.addEventListener('DOMContentLoaded', () => {
    const videoUrlInput = document.getElementById('videoUrl');
    const downloadButton = document.getElementById('downloadButton');
    const statusMessage = document.getElementById('statusMessage');
    const downloadResult = document.getElementById('downloadResult');

    const BASE_URL = window.location.origin + '/api';

    downloadButton.addEventListener('click', async () => {
        const url = videoUrlInput.value.trim();
        if (!url) return alert("Linki daxil edin!");

        statusMessage.innerHTML = '<span class="loading"><i class="fas fa-spinner fa-spin"></i> Axtarılır...</span>';
        downloadResult.innerHTML = '';
        downloadButton.disabled = true;

        try {
            const response = await fetch(`${BASE_URL}/info?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (!response.ok || !data.download_url) {
                throw new Error("Video linki tapılmadı. Hesab gizli ola bilər.");
            }
            
            const proxiedThumb = data.thumbnail ? `${BASE_URL}/proxy-image?url=${encodeURIComponent(data.thumbnail)}` : "";
            
            statusMessage.innerHTML = '<span style="color: #00f2fe;">Uğurlu!</span>';

            downloadResult.innerHTML = `
                <div class="result-card">
                    <div class="card-preview">
                        <img src="${proxiedThumb}" alt="Thumbnail" onerror="this.src='https://via.placeholder.com/400x250?text=Hazirdir'">
                        <span class="badge">${data.duration}</span>
                    </div>
                    <div class="card-info">
                        <h3>${data.title}</h3>
                        <div class="user-tag">
                            <div class="avatar">${data.uploader.charAt(0).toUpperCase()}</div>
                            <div class="username">
                                <div>@${data.uploader}</div>
                                <div style="font-size: 0.7rem; color: #888;">${data.platform}</div>
                            </div>
                        </div>
                        <a href="${BASE_URL}/download-video?url=${encodeURIComponent(data.download_url)}" target="_blank" class="final-dl-btn">
                            <i class="fas fa-cloud-download-alt"></i> VİDEONU YÜKLƏ (.MP4)
                        </a>
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
