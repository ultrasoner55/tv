const channelData = [
  {
    name: "TRT 1 HD",
    url: "https://tv-trt1.medya.trt.com.tr/master.m3u8"
  },
  {
    name: "TRT HABER HD",
    url: "https://tv-trthaber.medya.trt.com.tr/master.m3u8"
  },
  {
    name: "TRT SPOR HD",
    url: "https://tv-trtspor1.medya.trt.com.tr/master.m3u8"
  },
  {
    name: "TRT BELGESEL",
    url: "https://tv-trtbelgesel.medya.trt.com.tr/master.m3u8"
  },
  {
    name: "ATV HD",
    url: "https://atv-live.daioncdn.net/atv/atv.m3u8"
  },
  {
    name: "A HABER HD",
    url: "https://ahaber-live.daioncdn.net/ahaber/ahaber.m3u8"
  },
  {
    name: "NTV HD",
    url: "https://dogus-live.daioncdn.net/ntv/ntv.m3u8"
  },
  {
    name: "STAR TV HD",
    url: "https://dogus-live.daioncdn.net/startv/startv.m3u8"
  },
  {
    name: "HALK TV",
    url: "https://halktv-live.daioncdn.net/halktv/halktv.m3u8"
  },
  {
    name: "KRAL POP",
    url: "https://dogus-live.daioncdn.net/kralpop/kralpop.m3u8"
  }
];

const container = document.getElementById("channelGroups");
const video = document.getElementById("videoPlayer");
let hls;

function play(ch, btn) {
  document.querySelectorAll("button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  if (hls) hls.destroy();

  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(ch.url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = ch.url;
    video.play();
  }
}

channelData.forEach((ch, i) => {
  const btn = document.createElement("button");
  btn.innerHTML = `${i + 1}• ${ch.name}`;
  btn.onclick = () => play(ch, btn);
  container.appendChild(btn);
});

document.getElementById("themeToggle").onclick = () => {
  document.body.classList.toggle("day");
};
