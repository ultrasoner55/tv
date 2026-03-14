const video = document.getElementById('videoPlayer');
const container = document.getElementById('channelGroups');
const themeBtn = document.getElementById('themeBtn');
let hls = null;

// --- TEMA AYARLARI ---
if (themeBtn) {
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

// --- M3U YÜKLEME VE PARÇALAMA ---
async function loadM3U() {
    try {
        const response = await fetch('tv.m3u'); //
        if (!response.ok) throw new Error('Dosya bulunamadı');
        const data = await response.text(); //
        const channels = parseM3U(data);
        displayChannels(channels);
    } catch (e) {
        container.innerHTML = `<div style="padding:20px; color:red;">Liste yüklenemedi.</div>`;
    }
}

function parseM3U(data) {
    const lines = data.split('\n');
    const channels = [];
    let current = {};
    
    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF')) { //
            current = {};
            current.group = line.match(/group-title="([^"]+)"/)?.[1] || "TV";
            current.logo = line.match(/tvg-logo="([^"]+)"/)?.[1] || "favicon.png";
            current.name = line.split(',')[1]?.trim() || "Kanal";
        } else if (line.startsWith('http')) { //
            current.url = line.trim();
            channels.push({...current});
        }
    });
    return channels;
}

// --- KANALLARI LİSTELEME ---
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
                // Seçili kanal vurgusu (Opsiyonel görsel şölen)
                document.querySelectorAll('.channel-item').forEach(el => el.style.background = 'none');
                item.style.background = 'rgba(255,
