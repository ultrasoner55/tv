const video = document.getElementById('videoPlayer');
const container = document.getElementById('channelGroups');
const themeBtn = document.getElementById('themeBtn');
let hls = null;

// Tema ilk yükleme
themeBtn.innerText = document.body.classList.contains('day') ? '☀️' : '🌙';

// --- TEMA DEĞİŞTİRME (DOKUNMATİK UYUMLU) ---
const toggleTheme = (e) => {
    // Mobilde tıklama ve dokunma çakışmasını önler
    if (e.type === 'touchstart') e.preventDefault(); 
    
    document.body.classList.toggle('day');
    const isDay = document.body.classList.contains('day');
    themeBtn.innerText = isDay ? '☀️' : '🌙';
    localStorage.setItem('tv-theme', isDay ? 'day' : 'night');
};

// Hem tıklama hem dokunma için dinleyici ekle
themeBtn.addEventListener('click', toggleTheme);
themeBtn.addEventListener('touchstart', toggleTheme, { passive: false });

async function loadM3U() {
    try {
        const response = await fetch('tv.m3u');
        const data = await response.text();
        const channels = parseM3U(data);
        displayChannels(channels);
    } catch (e) {
        container.innerHTML = "Hata.";
    }
}

function parseM3U(data) {
    const lines = data.split('\n');
    const channels = [];
    let current = {};
    lines.forEach(line => {
        if (line.startsWith('#EXTINF')) {
            current.group = line.match(/group-title="([^"]+)"/)?.[1] || "TV";
            current.logo = line.match(/tvg-logo="([^"]+)"/)?.[1] || "favicon.png";
            current.name = line.split(',')[1]?.trim() || "Kanal";
        } else if (line.startsWith('http')) {
            current.url = line.trim();
            channels.push({...current});
        }
    });
    return channels;
}

function displayChannels(channels) {
    container.innerHTML = '';
    const groups = {};
    channels.forEach(ch => {
        if (!groups[ch.group]) groups[ch.group] = [];
        groups[ch.group].push(ch);
    });

    for (const g in groups) {
        const header = document.createElement('div');
        header.className = 'group-header';
        header.innerText = g;
        container.appendChild(header);

        groups[g].forEach(ch => {
            const item = document.createElement('div');
            item.className = 'channel-item';
            item.innerHTML = `<img src="${ch.logo}" onerror="this.src='favicon.png'"><span>${ch.name}</span>`;
            item.onclick = () => playStream(ch.url);
            container.appendChild(item);
        });
    }
}

function playStream(url) {
    if (hls) hls.destroy();
    if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play();
    }
}

// --- LOGO VE BAŞLATMA AYARLARI ---
document.addEventListener('DOMContentLoaded', () => {
    loadM3U();
    
    // HTML'deki id'ye uygun olarak "logoToTop" veya "logoBtn" kontrolü
    const logo = document.getElementById('logoToTop') || document.getElementById('logoBtn');
    
    if (logo) {
        const scrollToTop = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            
            container.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };

        logo.addEventListener('click', scrollToTop);
        logo.addEventListener('touchstart', scrollToTop, { passive: false });
    }
});
