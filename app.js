// 1. GÜNCEL KANAL VERİLERİ (Mart 2026)
const channelData = [
  {
    category: "Ulusal Kanallar",
    channels: [
      { name: "1•TRT 1 HD", url: "https://tv-trt1.medya.trt.com.tr/master.m3u8" },
      { name: "2•TRT HABER HD", url: "https://tv-trthaber.medya.trt.com.tr/master.m3u8" },
      { name: "3•TRT SPOR HD", url: "https://tv-trtspor1.medya.trt.com.tr/master.m3u8" },
      { name: "4•TRT BELGESEL", url: "https://tv-trtbelgesel.medya.trt.com.tr/master.m3u8" },
      { name: "5•TRT MÜZİK", url: "https://tv-trtmuzik.medya.trt.com.tr/master.m3u8" },
      { name: "6•ATV HD", url: "https://atv-live.daioncdn.net/atv/atv.m3u8" },
      { name: "7•A HABER HD", url: "https://ahaber-live.daioncdn.net/ahaber/ahaber.m3u8" },
      { name: "8•A SPOR HD", url: "https://aspor-live.daioncdn.net/aspor/aspor.m3u8" },
      { name: "9•NTV HD", url: "https://dogus-live.daioncdn.net/ntv/ntv.m3u8" },
      { name: "10•STAR TV HD", url: "https://dogus-live.daioncdn.net/startv/startv.m3u8" },
      { name: "11•KRAL POP", url: "https://dogus-live.daioncdn.net/kralpop/kralpop.m3u8" },
      { name: "12•HALK TV", url: "https://halktv-live.daioncdn.net/halktv/halktv.m3u8" },
      { name: "13•TV100", url: "https://tv100-live.ercdn.net/tv100/tv100.m3u8" }
    ]
  }
];

const channelGroupsEl = document.getElementById("channelGroups");
const videoEl = document.getElementById("videoPlayer");
const themeToggleBtn = document.getElementById("themeToggle");

let hls;

// 2. OYNATMA FONKSİYONU
function playChannel(channel, btnEl) {
  document.querySelectorAll(".channel-group button").forEach((button) => button.classList.remove("active"));
  btnEl.classList.add("active");

  if (hls) {
    hls.destroy();
  }

  if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
    videoEl.src = channel.url;
    videoEl.play().catch(e => console.error("Oynatma hatası:", e));
  } 
  else if (window.Hls && Hls.isSupported()) {
    hls = new Hls({
      xhrSetup: function (xhr) {
        xhr.withCredentials = false;
      }
    });
    hls.loadSource(channel.url);
    hls.attachMedia(videoEl);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoEl.play().catch(e => console.error("Oynatma hatası:", e));
    });
  }
}

// 3. KANAL LİSTESİNİ OLUŞTURMA
function buildChannels() {
  if (!channelGroupsEl) return;
  channelData.forEach((group) => {
    const wrapper = document.createElement("section");
    wrapper.className = "channel-group";
    group.channels.forEach((channel) => {
      const button = document.createElement("button");
      button.textContent = channel.name;
      button.addEventListener("click", () => playChannel(channel, button));
      wrapper.appendChild(button);
    });
    channelGroupsEl.appendChild(wrapper);
  });
}

// 4. TEMA VE BAŞLATMA
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("day");
    themeToggleBtn.textContent = document.body.classList.contains("day") ? "☀️" : "🌙";
  });
}

buildChannels();
