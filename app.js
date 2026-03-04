const channelData = [
  {
    category: "Ulusal Haber",
    channels: [
      { name: "1•TRT 1 HD", url: "https://tv-trt1.medya.trt.com.tr/master.m3u8" },
      { name: "2•TRT HABER HD", url: "https://tv-trthaber.medya.trt.com.tr/master.m3u8" },
      { name: "3•TRT SPOR HD", url: "https://tv-trtspor1.medya.trt.com.tr/master.m3u8" },
      { name: "4•TRT TÜRK HD", url: "https://tv-trtturk.medya.trt.com.tr/master.m3u8" },
      { name: "5•TRT MÜZİK HD", url: "https://tv-trtmuzik.medya.trt.com.tr/master.m3u8" }, // Buradaki virgül eksikti
      { name: "6•TRT BELGESEL HD", url: "https://tv-trtbelgesel.medya.trt.com.tr/master.m3u8" },
      { name: "7•SHOW TV", url: "https://tv-trtspor2.medya.trt.com.tr/master.m3u8" },
      { name: "8•SHOW TÜRK", url: "https://trkvz-live.daioncdn.net/aspor/aspor.m3u8" },
      { name: "9•KANAL D", url: "https://ssportplusmobilehls.ercdn.net/SSportPlus/movie.m3u8" }, // Buradaki virgül eksikti
      { name: "10•EURO D", url: "https://tv-trtbelgesel.medya.trt.com.tr/master.m3u8" },
      { name: "11•ATV", url: "https://trkvz.daioncdn.net/atv/atv_1080p.m3u8?e=1772635715&st=H5NUj0b0gUZTydSzdjQKqw&sid=87rw3sbzvpnn&app=d1ce2d40-5256-4550-b02e-e73c185a314e&ce=3" },
      { name: "12•ATV AVRUPA", url: "https://tv-eba.medya.trt.com.tr/master.m3u8" }, // Buradaki virgül eksikti
      { name: "13•NTV", url: "https://dogus-live.daioncdn.net/kralpop/kralpop.m3u8" },
      { name: "14•DMAX", url: "https://dogus-live.daioncdn.net/dreamturk/dreamturk.m3u8" },
      { name: "15•NOW TV", url: "https://livetv.powerapp.com.tr/powerturkTV/powerturkhd.smil/chunklist_w650000.m3u8" }
    ]
  }
];

// HTML elementlerini seçiyoruz
const channelGroupsEl = document.getElementById("channelGroups");
const videoEl = document.getElementById("videoPlayer");
const themeToggleBtn = document.getElementById("themeToggle");

let hls;

function playChannel(channel, btnEl) {
  // Eski aktif butonları temizle
  document.querySelectorAll(".channel-group button").forEach((button) => button.classList.remove("active"));
  btnEl.classList.add("active");

  if (hls) {
    hls.destroy();
  }

  // Tarayıcı m3u8 destekliyor mu? (Örn: Safari)
  if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
    videoEl.src = channel.url;
    videoEl.play().catch(() => console.log("Video başlatılamadı."));
  } 
  // Desteklemiyorsa Hls.js kullan (Örn: Chrome, Brave)
  else if (window.Hls && Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(channel.url);
    hls.attachMedia(videoEl);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoEl.play();
    });
  }
}

function buildChannels() {
  if (!channelGroupsEl) return;

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

function initTheme() {
  if (!themeToggleBtn) return;
  
  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("day");
    themeToggleBtn.textContent = document.body.classList.contains("day") ? "☀️" : "🌙";
  });
}

// Uygulamayı çalıştır
buildChannels();
initTheme();
