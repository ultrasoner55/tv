const video = document.getElementById('videoPlayer');
const container = document.getElementById('channelGroups');
const themeBtn = document.getElementById('themeBtn');
let hls = null;

// TEMA AYARI
if (themeBtn) {
    themeBtn.onclick = () => {
        document.body.classList.toggle('day');
        localStorage.setItem('tv-theme', document.body.classList.contains('day') ? 'day' : 'night');
    };
}

// M3U YÜKLEME
async function loadM3U() {
    try {
        const response = await fetch('tv.m3u?v=' + Date.now());
        const data = await response.text();
        const channels = parseM3U(data);
        displayChannels(channels);
    } catch (e) { container.innerHTML = "Hata!"; }
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

// OYNATICI
function playStream(url) {
    if (hls) hls.destroy();
    
    // TRT gibi zorlu kanallar için her zaman proxy kullanmak daha garantidir
    const finalUrl = "proxy.php?url=" + encodeURIComponent(url);

    if (Hls.isSupported()) {
        hls = new Hls({
            xhrSetup: xhr => xhr.withCredentials = false,
            // Bağlantı koparsa otomatik tekrar dene
            manifestLoadingMaxRetry: 5,
            levelLoadingMaxRetry: 5
        });
        hls.loadSource(finalUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = finalUrl;
        video.play();
    }
}

document.addEventListener('DOMContentLoaded', loadM3U);
