const video = document.getElementById('videoPlayer');
const container = document.getElementById('channelGroups');
const themeBtn = document.getElementById('themeBtn');
let hls = null;
let retryTimeout = null;

if (themeBtn) {
    themeBtn.onclick = () => {
        const isDay = document.body.classList.toggle('day');
        themeBtn.classList.toggle('day', isDay);
        localStorage.setItem('tv-theme', isDay ? 'day' : 'night');
    };
}
(function () {
    const saved = localStorage.getItem('tv-theme');
    if (saved === 'day' && themeBtn) themeBtn.classList.add('day');
})();

// --- METV YEDEK LİSTELERİ ---
const METV_BASE = 'https://raw.githubusercontent.com/mehmetey03/METV/main/';
const METV_BACKUP_LISTS = [
    'metv.m3u', 'liste.m3u', 'liste2.m3u',
    'haber.m3u', 'muzik.m3u', 'cocuk.m3u',
    'belgesel.m3u', 'atom.m3u'
];

// METV kanallarını arka planda çek, isim → [url, url, ...] şeklinde tut
const metvIndex = {}; // { "kanal d": ["url1", "url2", ...], ... }

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

// METV listelerini arka planda sessizce yükle, index'e ekle
async function loadMETVBackup() {
    const results = await Promise.allSettled(
        METV_BACKUP_LISTS.map(f => fetchWithProxy(METV_BASE + f))
    );
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            parseM3U(result.value).forEach(ch => {
                const key = normalizeName(ch.name);
                if (!metvIndex[key]) metvIndex[key] = [];
                if (!metvIndex[key].includes(ch.url)) {
                    metvIndex[key].push(ch.url);
                }
            });
        }
    });
    console.log('METV yedek index hazır:', Object.keys(metvIndex).length, 'kanal');
}

// İsim normalizasyonu: "Kanal D" → "kanal d", "KANAL D" → "kanal d"
function normalizeName(name) {
    return name.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9ığüşöçı ]/g, '')
        .trim();
}

// Kanalın yedek URL'lerini METV'den bul
function getBackupUrls(channelName) {
    const key = normalizeName(channelName);
    // Tam eşleşme
    if (metvIndex[key]) return metvIndex[key];
    // Kısmi eşleşme (ör. "trt 1" ile "trt1" eşleşsin)
    const keyNoSpace = key.replace(/\s/g, '');
    for (const k of Object.keys(metvIndex)) {
        if (k.replace(/\s/g, '') === keyNoSpace) return metvIndex[k];
    }
    // İçinde geçiyor mu? (ör. "bein sports 1" ile "bein 1")
    for (const k of Object.keys(metvIndex)) {
        if (k.includes(key) || key.includes(k)) return metvIndex[k];
    }
    return [];
}

// --- ANA YÜKLEME: sadece kendi tv.m3u ---
async function loadM3U() {
    container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text);">⏳ Yükleniyor...</div>`;

    try {
        const localRes = await fetch('./tv.m3u?v=' + Date.now());
        if (!localRes.ok) throw new Error('tv.m3u bulunamadı');
        const channels = parseM3U(await localRes.text());

        if (channels.length === 0) {
            container.innerHTML = "<div style='padding:20px;'>Kanal bulunamadı.</div>";
        } else {
            displayChannels(channels);
            const hdr = document.querySelector('.sidebar-header');
            if (hdr) hdr.textContent = 'Kanal Listesi (' + channels.length + ')';
        }

        // METV yedeklerini arka planda yükle (siteyi dondurmaz)
        loadMETVBackup();

    } catch (e) {
        container.innerHTML = "<div style='padding:20px; color:red;'>Hata: " + e.message + "</div>";
    }
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
            item.innerHTML = '<img src="' + ch.logo + '" onerror="this.src=\'favicon.png\'"><span>' + ch.name + '</span>';
            item.onclick = () => {
                document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                playWithFallback(ch);
            };
            container.appendChild(item);
        });
    }
}

// --- AKILLI OYNATICI: önce kendi URL, olmadı METV yedekleri ---
function playWithFallback(ch) {
    const backups = getBackupUrls(ch.name);
    const urlQueue = [ch.url, ...backups];
    console.log(ch.name + ' için ' + urlQueue.length + ' URL var');
    tryNextUrl(urlQueue, 0, ch.name);
}

function tryNextUrl(queue, index, channelName) {
    if (index >= queue.length) {
        showPlayerMessage('Yayın bulunamadı');
        return;
    }

    const url = queue[index];
    if (retryTimeout) clearTimeout(retryTimeout);
    if (hls) { hls.destroy(); hls = null; }
    hidePlayerMessage();

    const isHttp = url.startsWith('http://');
    const proxyUrl = "https://proxy.ultrasoner55.workers.dev/?url=" + encodeURIComponent(url);
    const sourceUrl = isHttp ? proxyUrl : url;
    const fallbackUrl = isHttp ? url : proxyUrl;

    if (Hls.isSupported()) {
        hls = new Hls({
            xhrSetup: xhr => { xhr.withCredentials = false; },
            manifestLoadingTimeOut: 8000,
            manifestLoadingMaxRetry: 0,
            levelLoadingTimeOut: 8000,
        });
        hls.loadSource(sourceUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            hidePlayerMessage();
            video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                hls.destroy(); hls = null;
                // Önce proxy'siz dene, olmadı bir sonraki URL'ye geç
                if (!isHttp && index === 0) {
                    retryTimeout = setTimeout(() => tryNextUrl(queue, index, channelName), 300);
                    // fallback ile dene
                    tryUrlDirect(fallbackUrl, () => tryNextUrl(queue, index + 1, channelName));
                } else {
                    retryTimeout = setTimeout(() => tryNextUrl(queue, index + 1, channelName), 300);
                }
            }
        });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUrl;
        video.addEventListener('error', () => {
            tryNextUrl(queue, index + 1, channelName);
        }, { once: true });
        video.play().catch(() => {});
    }
}

function tryUrlDirect(url, onFail) {
    if (!Hls.isSupported()) return onFail();
    const testHls = new Hls({ manifestLoadingTimeOut: 6000, manifestLoadingMaxRetry: 0 });
    testHls.loadSource(url);
    testHls.attachMedia(video);
    testHls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (hls) { hls.destroy(); }
        hls = testHls;
        hidePlayerMessage();
        video.play().catch(() => {});
    });
    testHls.on(Hls.Events.ERROR, (e, d) => {
        if (d.fatal) { testHls.destroy(); onFail(); }
    });
}

function playStream(url, channelName = '') {
    if (retryTimeout) clearTimeout(retryTimeout);
    if (hls) { hls.destroy(); hls = null; }
    hidePlayerMessage();
    const isHttp = url.startsWith('http://');
    const proxyUrl = "https://proxy.ultrasoner55.workers.dev/?url=" + encodeURIComponent(url);
    setupHls(isHttp ? proxyUrl : url, true, channelName, isHttp ? url : proxyUrl);
}

function setupHls(sourceUrl, canFallback, channelName, fallbackUrl) {
    if (Hls.isSupported()) {
        hls = new Hls({ xhrSetup: xhr => { xhr.withCredentials = false; }, manifestLoadingTimeOut: 10000, manifestLoadingMaxRetry: 1 });
        hls.loadSource(sourceUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { hidePlayerMessage(); video.play().catch(() => {}); });
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                hls.destroy(); hls = null;
                if (canFallback) retryTimeout = setTimeout(() => setupHls(fallbackUrl, false, channelName, null), 500);
                else hidePlayerMessage();
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUrl;
        video.addEventListener('error', () => {
            if (canFallback) { video.src = fallbackUrl; video.load(); video.play().catch(() => {}); }
            else hidePlayerMessage();
        }, { once: true });
        video.play().catch(() => {});
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
    const proxies = [url, 'https://corsproxy.io/?' + encodeURIComponent(url), 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)];
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
    } catch(e) { setStatus('Hata: ' + e.message, true); }
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
        } catch(e) { setStatus('Hata: ' + e.message, true); }
    };
    reader.readAsText(file);
}

function setStatus(msg, isError) {
    const el = document.getElementById('m3uStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'm3u-status' + (isError ? ' error' : '');
}
