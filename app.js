// 1. Veri Yapısı (Virgül hataları düzeltildi)
const channelData = [
  {
    category: "Ulusal Haber",
    channels: [
      { name: "1-TRT Haber", url: "https://tv-trt1.medya.trt.com.tr/master.m3u8" },
      { name: "2-A Haber", url: "https://trkvz-live.daioncdn.net/ahaber/ahaber.m3u8" },
      { name: "3-Haber Global", url: "https://tv.ensonhaber.com/haberglobal/haberglobal.m3u8" },
      { name: "4-TV100", url: "https://tv100-live.ercdn.net/tv100/tv100.m3u8" },
      { name: "5-Bloomberg HT", url: "https://bloomberght.live.cdn.bitgravity.com/cdn-live/stream.m3u8" }, // Virgül eklendi
      { name: "6-TRT Spor", url: "https://tv-trtspor1.medya.trt.com.tr/master.m3u8" },
      { name: "7-TRT Spor Yıldız", url: "https://tv-trtspor2.medya.trt.com.tr/master.m3u8" },
      { name: "8-A Spor", url: "https://trkvz-live.daioncdn.net/aspor/aspor.m3u8" },
      { name: "9-S Sport Plus Tanıtım", url: "https://ssportplusmobilehls.ercdn.net/SSportPlus/movie.m3u8" }, // Virgül eklendi
      { name: "10-TRT Belgesel", url: "https://tv-trtbelgesel.medya.trt.com.tr/master.m3u8" },
      { name: "NASA TV", url: "https://ntv1-lh.akamaihd.net/i/NASA_101@319270/master.m3u8" },
      { name: "TRT EBA TV", url: "https://tv-eba.medya.trt.com.tr/master.m3u8" }, // Virgül eklendi
      { name: "Kral Pop TV", url: "https://dogus-live.daioncdn.net/kralpop/kralpop.m3u8" },
      { name: "Dream Türk", url: "https://dogus-live.daioncdn.net/dreamturk/dreamturk.m3u8" },
      { name: "PowerTürk TV", url: "https://livetv.powerapp.com.tr/powerturkTV/powerturkhd.smil/chunklist_w650000.m3u8" }
    ]
  }
];

// 2. Element Seçiciler
const channelGroupsEl = document.getElementById("channelGroups");
const videoEl = document.getElementById("videoPlayer");
const themeToggleBtn = document.getElementById("themeToggle");

let hls;

// 3. Oynatma Fonksiyonu
function playChannel(channel, btnEl) {
  // Aktif buton stilini güncelle
  document.querySelectorAll(".channel-group button").forEach((button) => button.classList.remove("active"));
  btnEl.classList.add("active");

  if (hls) {
    hls.destroy();
  }

  // Safari desteği (Native HLS)
  if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
    videoEl.src = channel.url;
    videoEl.play().catch(e => console.error("Oynatma hatası:", e));
  } 
  // Diğer tarayıcılar (hls.js kütüphanesi ile)
  else if (window.Hls && Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(channel.url);
    hls.attachMedia(videoEl);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoEl.play().catch(e => console.error("Oynatma hatası:", e));
    });
  }
}

// 4. Arayüzü Oluşturma
function buildChannels() {
  if(!channelGroupsEl) return; // Element yoksa durdur

  channelData.forEach((group) => {
    const wrapper = document.createElement("section");
    wrapper.className = "channel-group";

    const title = document.createElement("h3");
    title.textContent = group.category;
    wrapper.appendChild(title);

    group.channels.forEach((channel) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = channel.name;
      button.addEventListener("click", () => playChannel(channel, button));
      wrapper.appendChild(button);
    });

    channelGroupsEl.appendChild(wrapper);
  });
}

// 5. Tema Yönetimi
function applyTheme(theme) {
  const isDay = theme === "day";
  document.body.classList.toggle("day", isDay);
  if(themeToggleBtn) themeToggleBtn.textContent = isDay ? "☀️" : "🌙";
}

function initTheme() {
  const savedTheme = localStorage.getItem("tv_theme") || "night";
  applyTheme(savedTheme);

  if(themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("day") ? "night" : "day";
      localStorage.setItem("tv_theme", nextTheme);
      applyTheme(nextTheme);
    });
  }
}

// Uygulamayı Başlat
buildChannels();
initTheme();
