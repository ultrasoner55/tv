const video = document.getElementById('videoPlayer');
const container = document.getElementById('channelGroups');
const themeBtn = document.getElementById('themeBtn');
let hls = null;

// --- TEMA VE BAŞLATMA ---
if (themeBtn) {
    themeBtn.innerText = document.body.classList.contains('day') ? '☀️' : '🌙';
    themeBtn.onclick = () => {
        document.body.classList.toggle('day');
        const isDay = document.body.classList.contains('day');
        themeBtn.innerText = isDay ? '☀️' : '🌙';
        localStorage.setItem('tv-theme', isDay ? 'day' : 'night');
    };
}

// --- M3U YÜKLEME ---
async function loadM3U() {
    try {
        const response = await fetch('tv.m3u?v=' + Date.now());
        const data = await response.text();
        const channels = parseM3U(data);
        displayChannels(channels);
    } catch (e) {
        container.innerHTML = "<div style='padding:20px; color:red;'>Liste yüklenemedi!</div>";
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
                group: line.match(/group-title="([^"]+)"/)?.[1] || "Genel",
                logo: line.match(/tvg-logo="([^"]+)"/)?.[1] || "favicon.png",
                name: line.split(',')[1]?.trim() || "Kanal"
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

// --- AKILLI OYNATICI (ESKİ TRT DOSTU HALİ) ---
function playStream(url) {
    if (hls) hls.destroy();
    
    const proxyUrl = "proxy.php?url=" + encodeURIComponent(url);

    const setupHls = (sourceUrl, isFirstAttempt = true) => {
        if (Hls.isSupported()) {
            hls = new Hls({
                xhrSetup: xhr => xhr.withCredentials = false,
                manifestLoadingMaxRetry: 3
            });
            
            hls.loadSource(sourceUrl);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
            
            // Eğer ilk denemede hata alırsa (TRT değilse ve engelliyse)
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal && isFirstAttempt) {
                    console.warn("Direkt bağlantı başarısız, Proxy deneniyor...");
                    hls.destroy();
                    setupHls(proxyUrl, false); // İkinci deneme proxy ile
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari için
            video.src = sourceUrl;
            video.play();
        }
    };

    // ÖNCE DİREKT DENE (TRT'nin çalışması için bu şart)
    setupHls(url, true);
}

document.addEventListener('DOMContentLoaded', loadM3U);
