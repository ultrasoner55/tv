function playStream(url) {
    if (hls) hls.destroy();
    
    // PHP dosyası GitHub'da çalışmadığı için dış proxy servisi kullanıyoruz
    const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);

    const setupHls = (sourceUrl, isFirstAttempt = true) => {
        if (Hls.isSupported()) {
            hls = new Hls({
                xhrSetup: xhr => xhr.withCredentials = false
            });
            hls.loadSource(sourceUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
            
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal && isFirstAttempt) {
                    console.warn("Direkt bağlantı başarısız, Dış Proxy deneniyor...");
                    hls.destroy();
                    setupHls(proxyUrl, false); 
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = isFirstAttempt ? sourceUrl : proxyUrl;
            video.play();
        }
    };

    setupHls(url, true);
}
