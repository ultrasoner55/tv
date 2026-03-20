const video = document.getElementById('videoPlayer');
const container = document.getElementById('channelGroups');
const themeBtn = document.getElementById('themeBtn');
let hls = null;
let retryTimeout = null;

// --- TEMA AYARLARI ---
if (themeBtn) {
    themeBtn.onclick = () => {
        const isDay = document.body.classList.toggle('day');
        themeBtn.classList.toggle('day', isDay);
        localStorage.setItem('tv-theme', isDay ? 'day' : 'night');
    };
}

(function () {
    const saved = localStorage.getItem('tv-theme');
    if (saved === 'day' && themeBtn) {
        themeBtn.classList.add('day');
    }
})();

// --- KANAL LİSTESİNİ ÇEKME ---
const METV_URL = 'https://raw.githubusercontent.com/mehmetey03/METV/main/tv.m3u';

async function fetchMETV() {
    const proxies = [
        METV_URL,
        'https://corsproxy.io/?' + encodeURIComponent(METV_URL),
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(METV_URL)
    ];
    for (const p of proxies) {
        try {
            const res = await fetch(p);
            if (!res.ok) continue;
            const text = await res.text();
            if (text.includes('#EXTM3U')) return text;
        } catch(e) {}
    }
    return null;
}

async function loadM3U() {
    try {
        const response = await fetch('./tv.m3u?v=' + Date.now());
        if (!response.ok) throw new Error('M3U dosyası bulunamadı!');
        const data = await response.text();
        let channels = parseM3U(data);

        // METV listesini de çek ve birleştir
        const metvText = await fetchMETV();
        if (metvText) {
            const metvChannels = parseM3U(metvText);
            // Duplicate önlemek için: aynı isim ve URL'ye sahip kanalları filtrele
            const existingKeys = new Set(channels.map(ch => ch.name.toLowerCase() + '|' + ch.url));
            const newChannels = metvChannels.filter(ch => !existingKeys.has(ch.name.toLowerCase() + '|' + ch.url));
            channels = channels.concat(newChannels);
            console.log(`METV'den ${newChannels.length} yeni kanal eklendi.`);
        } else {
            console.warn('METV listesi yüklenemedi, sadece yerel liste kullanılıyor.');
        }

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
    const lines = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
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
            current.url = line.trim().replace(/\s+/g, '');
            channels.push({ ...current });
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
                playStream(ch.url, ch.name);
            };
            container.appendChild(item);
        });
    }
}

// --- GELİŞMİŞ OYNATICI ---
function playStream(url, channelName = '') {
    if (retryTimeout) clearTimeout(retryTimeout);
    if (hls) {
        hls.destroy();
        hls = null;
    }

    hidePlayerMessage();

    const isHttp = url.startsWith('http://');
    const proxyUrl = "https://proxy.ultrasoner55.workers.dev/?url=" + encodeURIComponent(url);

    if (isHttp) {
        setupHls(proxyUrl, false, channelName, url);
    } else {
        setupHls(url, true, channelName, proxyUrl);
    }
}

function setupHls(sourceUrl, canFallback, channelName, fallbackUrl) {
    if (Hls.isSupported()) {
        hls = new Hls({
            xhrSetup: xhr => {
                xhr.withCredentials = false;
            },
            manifestLoadingTimeOut: 10000,
            manifestLoadingMaxRetry: 1,
            levelLoadingTimeOut: 10000,
        });

        hls.loadSource(sourceUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            hidePlayerMessage();
            video.play().catch(e => console.warn("Otomatik oynatma engellendi:", e));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal || data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
                if (canFallback) {
                    hidePlayerMessage();
                    hls.destroy();
                    hls = null;
                    retryTimeout = setTimeout(() => {
                        setupHls(fallbackUrl, false, channelName, null);
                    }, 500);
                } else {
                    hidePlayerMessage();
                    hls.destroy();
                    hls = null;
                }
            }
        });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUrl;
        video.addEventListener('error', () => {
            if (canFallback) {
                video.src = fallbackUrl;
                video.load();
                video.play().catch(() => {});
            } else {
                hidePlayerMessage();
            }
        }, { once: true });
        video.play().catch(() => {});
    } else {
        hidePlayerMessage();
    }
}

// --- PLAYER MESAJ FONKSİYONLARI ---
function showPlayerMessage(msg) {
    let overlay = document.getElementById('playerOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'playerOverlay';
        overlay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.75);
            color: #fff;
            padding: 14px 22px;
            border-radius: 10px;
            font-size: 14px;
            text-align: center;
            pointer-events: none;
            z-index: 10;
            max-width: 80%;
        `;
        const playerCard = document.querySelector('.player-card');
        if (playerCard) {
            playerCard.style.position = 'relative';
            playerCard.appendChild(overlay);
        }
    }
    overlay.textContent = msg;
    overlay.style.display = 'block';
}

function hidePlayerMessage() {
    const overlay = document.getElementById('playerOverlay');
    if (overlay) overlay.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    loadM3U();

    // M3U TOGGLE
    const m3uToggle = document.getElementById('m3uToggle');
    if (m3uToggle) {
        m3uToggle.addEventListener('click', function() {
            const body = document.getElementById('m3uBody');
            const arrow = document.getElementById('m3uArrow');
            if (!body) return;
            const isOpen = body.style.display === 'flex';
            body.style.display = isOpen ? 'none' : 'flex';
            if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
        });
    }

    // M3U URL YÜKLE
    const m3uBtn = document.querySelector('.m3u-btn');
    if (m3uBtn) m3uBtn.addEventListener('click', loadFromUrl);

    // M3U DOSYA
    const m3uFile = document.getElementById('m3uFile');
    if (m3uFile) m3uFile.addEventListener('change', function() { loadFromFile(this); });
});

async function fetchWithFallback(url) {
    const proxies = [
        url,
        'https://corsproxy.io/?' + encodeURIComponent(url),
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
    ];
    for (const p of proxies) {
        try {
            const res = await fetch(p);
            if (!res.ok) continue;
            const text = await res.text();
            if (text.includes('#EXTM3U')) return text;
        } catch(e) {}
    }
    throw new Error('Bağlanamadı');
}

async function loadFromUrl() {
    const urlInput = document.getElementById('m3uUrl');
    const url = urlInput ? urlInput.value.trim() : '';
    if (!url) { setStatus('Lütfen bir URL girin.', true); return; }
    setStatus('Yükleniyor...');
    try {
        const text = await fetchWithFallback(url);
        const channels = parseM3U(text);
        if (channels.length === 0) throw new Error('Kanal bulunamadı');
        displayChannels(channels);
        setStatus('✓ ' + channels.length + ' kanal yüklendi');
        setTimeout(function() { setStatus(''); }, 3000);
    } catch(e) {
        setStatus('Hata: ' + e.message, true);
    }
}

function loadFromFile(input) {
    const file = input.files[0];
    if (!file) return;
    setStatus('Okunuyor...');
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            if (!text.includes('#EXTM3U')) throw new Error('Geçersiz M3U');
            const channels = parseM3U(text);
            if (channels.length === 0) throw new Error('Kanal bulunamadı');
            displayChannels(channels);
            setStatus('✓ ' + channels.length + ' kanal yüklendi');
        } catch(e) {
            setStatus('Hata: ' + e.message, true);
        }
    };
    reader.readAsText(file);
}

function setStatus(msg, isError) {
    const el = document.getElementById('m3uStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'm3u-status' + (isError ? ' error' : '');
}
