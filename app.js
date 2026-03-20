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

// --- METV REPO'DAN ÇEKİLECEK TÜM LİSTELER ---
const METV_BASE = 'https://raw.githubusercontent.com/mehmetey03/METV/main/';
const METV_LISTS = [
    '1.m3u','5.m3u','metv.m3u','haber.m3u','muzik.m3u',
    'cocuk.m3u','belgesel.m3u','dmax.m3u','liste.m3u','liste2.m3u',
    's.m3u','mono.m3u','inat.m3u','inattv.m3u','atom.m3u',
    'atom_mac.m3u','bossh.m3u','cafe.m3u','rectv.m3u','roxie.m3u',
    'joker.m3u','puhutv.m3u','salamistv.m3u','salamistv1.m3u',
    'all_world_sports.m3u','karsilasmalar.m3u','karsilasmalar1.m3u',
    'karsilasmalar2.m3u','karsilasmalar3.m3u','karsilasmalar4.m3u',
    'justsporthd.m3u','justsporthd1.m3u','daddylive.m3u',
    'daddyliveevents.m3u','ace.m3u','istplay_streams.m3u',
    'NexaTV.m3u','catcast_tv.m3u','global_radio.m3u',
    'indirilen_playlist.m3u','Roxiestreams.m3u8','justintv_kanallar.m3u8',
    'justintv_sirali.m3u8','ppv.m3u8','betorspin.m3u8','fscreen.m3u8'
];

const PROXIES = [
    url => url,
    url => 'https://corsproxy.io/?' + encodeURIComponent(url),
    url => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
];

async function fetchWithProxy(url) {
    for (const proxy of PROXIES) {
        try {
            const res = await fetch(proxy(url), { signal: AbortSignal.timeout(8000) });
            if (!res.ok) continue;
            const text = await res.text();
            if (text.includes('#EXTM3U') || text.includes('#EXTINF')) return text;
        } catch (e) {}
    }
    return null;
}

// --- ANA YÜKLEME FONKSİYONU ---
async function loadM3U() {
    container.innerHTML = `
        <div id="loadingMsg" style="padding:20px; text-align:center; color:var(--text);">
            <div style="margin-bottom:10px; font-size:15px;">⏳ Listeler yükleniyor...</div>
            <div id="loadProgress" style="font-size:12px; opacity:0.6;">Başlatılıyor...</div>
        </div>`;

    const setProgress = (msg) => {
        const el = document.getElementById('loadProgress');
        if (el) el.textContent = msg;
    };

    try {
        let allChannels = [];

        // 1. Yerel tv.m3u
        try {
            const localRes = await fetch('./tv.m3u?v=' + Date.now());
            if (localRes.ok) {
                const parsed = parseM3U(await localRes.text());
                allChannels = allChannels.concat(parsed);
                setProgress('✓ Yerel liste: ' + parsed.length + ' kanal');
            }
        } catch (e) {}

        // 2. METV listelerini 10'ar grupla paralel çek
        const total = METV_LISTS.length;
        let done = 0, metvTotal = 0;
        const chunkSize = 10;

        for (let i = 0; i < METV_LISTS.length; i += chunkSize) {
            const chunk = METV_LISTS.slice(i, i + chunkSize);
            const results = await Promise.allSettled(
                chunk.map(file => fetchWithProxy(METV_BASE + file))
            );
            results.forEach(result => {
                done++;
                if (result.status === 'fulfilled' && result.value) {
                    const parsed = parseM3U(result.value);
                    allChannels = allChannels.concat(parsed);
                    metvTotal += parsed.length;
                }
                setProgress('METV: ' + done + '/' + total + ' liste (' + metvTotal + ' kanal bulundu)');
            });
        }

        // 3. Duplicate temizle
        const seen = new Set();
        const unique = allChannels.filter(ch => {
            const key = ch.name.toLowerCase().trim() + '|' + ch.url.trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        if (unique.length === 0) {
            container.innerHTML = "<div style='padding:20px;'>Hiç kanal bulunamadı.</div>";
        } else {
            displayChannels(unique);
            const hdr = document.querySelector('.sidebar-header');
            if (hdr) hdr.textContent = 'Kanal Listesi (' + unique.length + ')';
        }

    } catch (e) {
        container.innerHTML = "<div style='padding:20px; color:red;'>Hata: " + e.message + "</div>";
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
                group: line.match(/group-title="([^"]+)"/)?.[1] || 'Genel',
                logo: line.match(/tvg-logo="([^"]+)"/)?.[1] || 'favicon.png',
                name: line.split(',').slice(1).join(',').trim() || 'Bilinmeyen Kanal'
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

    const sortedGroups = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'tr'));

    for (const g of sortedGroups) {
        const header = document.createElement('div');
        header.className = 'group-header';
        header.innerText = g + ' (' + groups[g].length + ')';
        container.appendChild(header);

        groups[g].forEach(ch => {
            const item = document.createElement('div');
            item.className = 'channel-item';
            item.innerHTML = '<img src="' + ch.logo + '" onerror="this.src=\'favicon.png\'"><span>' + ch.name + '</span>';
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
    if (hls) { hls.destroy(); hls = null; }
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
            xhrSetup: xhr => { xhr.withCredentials = false; },
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
                    hls.destroy(); hls = null;
                    retryTimeout = setTimeout(() => setupHls(fallbackUrl, false, channelName, null), 500);
                } else {
                    hidePlayerMessage();
                    hls.destroy(); hls = null;
                }
            }
        });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUrl;
        video.addEventListener('error', () => {
            if (canFallback) { video.src = fallbackUrl; video.load(); video.play().catch(() => {}); }
            else { hidePlayerMessage(); }
        }, { once: true });
        video.play().catch(() => {});
    } else {
        hidePlayerMessage();
    }
}

function showPlayerMessage(msg) {
    let overlay = document.getElementById('playerOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'playerOverlay';
        overlay.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);color:#fff;padding:14px 22px;border-radius:10px;font-size:14px;text-align:center;pointer-events:none;z-index:10;max-width:80%;';
        const playerCard = document.querySelector('.player-card');
        if (playerCard) { playerCard.style.position = 'relative'; playerCard.appendChild(overlay); }
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

    const m3uBtn = document.querySelector('.m3u-btn');
    if (m3uBtn) m3uBtn.addEventListener('click', loadFromUrl);

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
        setTimeout(() => setStatus(''), 3000);
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
