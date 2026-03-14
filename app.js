const video = document.getElementById('videoPlayer');
const container = document.getElementById('channelGroups');
const themeBtn = document.getElementById('themeBtn');
let hls = null;

// --- TEMA AYARLARI ---
if (themeBtn) {
    themeBtn.onclick = () => {
        document.body.classList.toggle('day');
        localStorage.setItem('tv-theme', document.body.classList.contains('day') ? 'day' : 'night');
    };
}

// --- KANAL LİSTESİNİ ÇEKME ---
async function loadM3U() {
    try {
        // GitHub Pages'ta önbellek hatasını önlemek için v= parametresi ekliyoruz
        const response = await fetch('./tv.m3u?v=' + Date.now());
        if (!response.ok) throw new Error('M3U dosyası GitHub üzerinde bulunamadı!');
        const data = await response.text();
        const channels = parseM3U(data);
        
        if (channels.length === 0) {
            container.innerHTML = "<div style='padding:20px;'>M3U dosyası boş veya formatı hatalı.</div>";
        } else {
            displayChannels(channels);
        }
    } catch (e) {
        container.innerHTML = `<div style='padding:20px; color:red;'>Hata: ${e.message}</div>`;
        console.error("M3U Hatası:", e);
    }
}

function parseM3U(data) {
    const lines = data.split('\n');
    const channels = [];
    let current = null;

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF')) {
            current = {
                group: line.match(/group-title="([^"]+)"/)?.[1] || "Kanal Listesi",
                logo: line.match(/tvg-logo="([^"]+)"/)?.[1] || "favicon.png",
                name: line.split(',')[1]?.trim() || "Bilinmeyen Kanal"
            };
        } else if (line.startsWith('http') && current) {
            current.url = line;
            channels.push({...current});
            current = null;
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
            item.onclick = () => {
                document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                playStream(ch.url);
            };
            container.appendChild(item);
        });
    }
}

// --- GİTHUB UYUMLU OYNATICI (DIŞ PROXY DESTEKLİ) ---
function playStream(url) {
    if (hls) hls.destroy();
    
    // PHP yerine GitHub'da çalışan ücretsiz dış proxy'yi tanımlıyoruz
    const externalProxy = "https://corsproxy.io/?" + encodeURIComponent(url);

    const setupHls = (sourceUrl, isFirstAttempt = true) => {
        if (Hls.isSupported()) {
            hls = new Hls({
                xhrSetup: xhr => xhr.withCredentials = false
            });
            hls.loadSource(sourceUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
            
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal && isFirstAttempt) {
                    console.warn("Direkt bağlantı başarısız, Dış Proxy (corsproxy.io) deneniyor...");
                    hls.destroy();
                    setupHls(externalProxy, false); 
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = isFirstAttempt ? sourceUrl : externalProxy;
            video.play();
        }
    };

    setupHls(url, true);
}

document.addEventListener('DOMContentLoaded', loadM3U);
