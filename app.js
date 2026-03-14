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

// Sayfa yüklenince kaydedilen temayı butona da uygula
(function () {
    const saved = localStorage.getItem('tv-theme');
    if (saved === 'day' && themeBtn) {
        themeBtn.classList.add('day');
    }
})();

// --- KANAL LİSTESİNİ ÇEKME ---
async function loadM3U() {
    try {
        const response = await fetch('./tv.m3u?v=' + Date.now());
        if (!response.ok) throw new Error('M3U dosyası bulunamadı!');
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

    showPlayerMessage(`⏳ ${channelName || 'Kanal'} yükleniyor...`);

    const isHttp = url.startsWith('http://');
    const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);

    if (isHttp) {
        console.log(`[${channelName}] HTTP link tespit edildi, proxy ile başlatılıyor.`);
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
            console.warn(`[${channelName}] HLS Hata:`, data.type, data.details, '| Fatal:', data.fatal);

            if (data.fatal || data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
                if (canFallback) {
                    console.warn(`[${channelName}] Direkt bağlantı başarısız → Proxy deneniyor...`);
                    showPlayerMessage(`🔄 ${channelName}: Alternatif sunucu deneniyor...`);
                    hls.destroy();
                    hls = null;
                    retryTimeout = setTimeout(() => {
                        setupHls(fallbackUrl, false, channelName, null);
                    }, 500);
                } else {
                    showPlayerMessage(`❌ ${channelName} şu anda yayında değil veya erişilemiyor.`);
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
                showPlayerMessage(`❌ ${channelName} şu anda yayında değil.`);
            }
        }, { once: true });
        video.play().catch(() => {});
    } else {
        showPlayerMessage('❌ Tarayıcınız HLS formatını desteklemiyor.');
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

document.addEventListener('DOMContentLoaded', loadM3U);
