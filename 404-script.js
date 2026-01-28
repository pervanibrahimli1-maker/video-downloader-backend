// 404-script.js

// Geri qayıtmaq funksiyası
function goBack() {
    window.history.back();
}

// Maus hərəkət etdikdə ikonun onu izləməsi (kiçik effekt)
document.addEventListener('mousemove', (e) => {
    const ghost = document.getElementById('ghostIcon');
    if (ghost) {
        const x = (window.innerWidth / 2 - e.pageX) / 30;
        const y = (window.innerHeight / 2 - e.pageY) / 30;
        ghost.style.transform = `translate(${x}px, ${y}px)`;
    }
});

// Konsola mesaj (Developers üçün)
console.log("%c404 - Adətən bura gəlib çıxmırlar :)", "color: #e21d6e; font-size: 20px; font-weight: bold;");