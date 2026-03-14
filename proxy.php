<?php
// proxy.php - Gelişmiş Casus Modu
$url = isset($_GET['url']) ? $_GET['url'] : null;
if (!$url) die("URL yok.");

// 1. Yayıncıyı en üst düzeyde kandırma
$options = [
    "http" => [
        "method" => "GET",
        "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36\r\n" .
                    "Accept: */*\r\n" .
                    "Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7\r\n" .
                    "Origin: https://www.google.com\r\n" .
                    "Referer: https://www.google.com/\r\n"
    ],
    "ssl" => [
        "verify_peer" => false, 
        "verify_peer_name" => false
    ]
];

$context = stream_context_create($options);
$content = @file_get_contents($url, false, $context);

if ($content === false) {
    header("HTTP/1.1 500 Internal Server Error");
    die("Yayın sunucusuna ulaşılamadı.");
}

// 2. CORS izinlerini sonuna kadar aç (Tarayıcıyı rahatlat)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/vnd.apple.mpegurl");

// 3. KRİTİK: Video parçalarını proxy üzerinden akmaya zorla
$base_url = substr($url, 0, strrpos($url, '/') + 1);
if (strpos($url, 'm3u8') !== false) {
    // Liste içindeki göreli yolları (parçaları) Proxy'li tam URL'ye çeviriyoruz
    $content = preg_replace('/^(?!http|#|https)(.*)$/m', $base_url . '$1', $content);
}

echo $content;
?>
