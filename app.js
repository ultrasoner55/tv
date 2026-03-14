// Elementleri seçiyoruz
const video = document.getElementById('videoPlayer');
const container = document.getElementById('channelGroups');
const themeBtn = document.getElementById('themeBtn');
let hls = null;

// --- TEMA AYARLARI ---
function initTheme() {
    if (!themeBtn) return;

    // Sayfa yüklendiğinde butonun ikonunu ayarla
    themeBtn.innerText = document.body.classList.contains('day') ? '☀️' : '🌙';

    const toggleTheme = (e) => {
        if (e.type === 'touchstart') e.preventDefault();
        document.body.classList.toggle('day');
        const isDay = document.body.classList.contains('day');
        themeBtn.innerText = isDay ? '☀️' : '🌙';
        localStorage.setItem('tv-theme', isDay ? 'day' : 'night');
    };

    themeBtn.addEventListener('click', toggleTheme);
    themeBtn.addEventListener('touchstart', toggleTheme, { passive: false });
}

// --- M3U YÜKLEME ---
async function loadM3U() {
    try {
        const response = await fetch('tv.m3u');
        if (!response.ok) throw new Error('M3U dosyası bulunamadı!');
        const data = await response.text();
        const channels = parseM3U(data);
        displayChannels(channels);
    } catch (e) {
        if (container) container.innerHTML = "<div style='color:red; padding:10px;'>Kanallar yüklenemedi.</div>";
        console.error("M3U Hatası:", e);
    }
}

function parseM3U(data) {
    const lines = data.split('\n');
    const channels = [];
    let current = {};
    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF')) {
            current = {};
            current.group = line.match(/group-title="([^"]+)"/)?.[1] || "Genel";
            current.logo = line.match(/tvg-logo="([^"]+)"/)?.[1] || "favicon.png";
            current.name = line.split(',')[1]?.trim() || "Kanal";
        } else if (line.startsWith('http')) {
            current.url = line;
            channels.push({...current});
        }
    });
    return channels;
}

function displayChannels(channels) {
    if (!container) return;
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

// --- OYNATICI MOTORU (ENGEL AŞICI EKLEMELİ) ---
function playStream(url) {
    if (hls) { hls.destroy(); hls = null; }

    // Padişahım, eğer kanal açılmazsa linkin başına bu proxy'yi ekliyoruz.
    // Şimdilik doğrudan ekliyorum; bazı yayıncılar bunu şart koşar.
    const proxy = "https://cors-anywhere.herokuapp.com/"; 
    
    // Not: Bazı yayınlar proxy ile, bazıları direkt çalışır. 
    // Eğer hata alırsanız "url" yerine "proxy + url" deneyebilirsiniz.
    let finalUrl = url; 

    if (Hls.isSupported()) {
        hls = new Hls({
            xhrSetup: function(xhr, url) {
                // Bu kısım eklentinin yaptığı işi kodla simüle etmeye çalışır
                xhr.withCredentials = false;
            }
        });
        hls.loadSource(finalUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.log("Otomatik oynatma engellendi, lütfen oynata basın."));
        });

        // Hata durumunda (CORS gibi) otomatik proxy deneme
        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.details === 'manifestLoadError' && !finalUrl.startsWith(proxy)) {
                console.log("CORS Engeli algılandı, Proxy deneniyor...");
                finalUrl = proxy + url;
                hls.loadSource(finalUrl);
            }
        });

    } else if (video && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = finalUrl;
        video.play();
    }
}

// --- BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadM3U();

    const logo = document.getElementById('logoToTop');
    if (logo && container) {
        const scrollToTop = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            container.scrollTo({ top: 0, behavior: 'smooth' });
        };
        logo.addEventListener('click', scrollToTop);
        logo.addEventListener('touchstart', scrollToTop, { passive: false });
    }
});
