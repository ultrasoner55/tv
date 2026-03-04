const channelData = [
  {
    category: "Ulusal Kanallar",
    channels: [
      { name: "TRT 1 HD", url: "https://tv-trt1.medya.trt.com.tr/master.m3u8" },
      { name: "TRT HABER HD", url: "https://tv-trthaber.medya.trt.com.tr/master.m3u8" },
      { name: "TRT SPOR HD", url: "https://tv-trtspor1.medya.trt.com.tr/master.m3u8" },
      { name: "TRT BELGESEL HD", url: "https://tv-trtbelgesel.medya.trt.com.tr/master.m3u8" },
      { name: "ATV HD", url: "https://atv-live.daioncdn.net/atv/atv.m3u8" },
      { name: "A HABER HD", url: "https://ahaber-live.daioncdn.net/ahaber/ahaber.m3u8" },
      { name: "A SPOR HD", url: "https://aspor-live.daioncdn.net/aspor/aspor.m3u8" },
      { name: "NTV HD", url: "https://dogus-live.daioncdn.net/ntv/ntv.m3u8" },
      { name: "STAR TV HD", url: "https://dogus-live.daioncdn.net/startv/startv.m3u8" },
      { name: "HALK TV HD", url: "https://halktv-live.daioncdn.net/halktv/halktv.m3u8" },
      { name: "KRAL POP", url: "https://dogus-live.daioncdn.net/kralpop/kralpop.m3u8" }
    ]
  }
];

const channelGroupsEl = document.getElementById("channelGroups");
const videoEl = document.getElementById("videoPlayer");
const themeToggleBtn = document.getElementById("themeToggle");
let hls;

function playChannel(channel, btnEl) {
  // Görsel güncelleme
  document.querySelectorAll(".channel-group button").forEach(b => b.classList.remove("active"));
  btnEl.classList.add("active");

  // Varsa eski yayını temizle
  if (hls) {
    hls.destroy();
  }

  // HLS Destekli tarayıcılar (Chrome, Android, Desktop)
  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(channel.url);
    hls.attachMedia(videoEl);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoEl.play();
    });
  } 
  // Safari ve iOS desteği
  else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
    videoEl.src = channel.url;
    videoEl.play();
  }
}

function buildChannels() {
  channelData.forEach(group => {
    const wrapper = document.createElement("div");
    wrapper.className = "channel-group";
    group.channels.forEach(ch => {
      const btn = document.createElement("button");
      btn.innerHTML = `<span>📺</span> ${ch.name}`;
      btn.onclick = () => playChannel(ch, btn);
      wrapper.appendChild(btn);
    });
    channelGroupsEl.appendChild(wrapper);
  });
}

// Tema Değiştirici
themeToggleBtn.onclick = () => {
  document.body.classList.toggle("day");
  themeToggleBtn.textContent = document.body.classList.contains("day") ? "☀️" : "🌙";
};

// Başlat
buildChannels();
