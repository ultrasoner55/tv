<?php
// proxy.php
$url = isset($_GET['url']) ? $_GET['url'] : null;
if (!$url) die("URL yok.");

// 1. Yayıncıyı kandırıyoruz
$options = [
    "http" => [
        "method" => "GET",
        "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36\r\n" .
                    "Referer: https://www.google.com/\r\n"
    ],
    "ssl" => ["verify_peer" => false, "verify_peer_name" => false]
];

$context = stream_context_create($options);
$content = @file_get_contents($url, false, $context);

if ($content === false) {
    header("HTTP/1.1 500 Error");
    die("Yayın çekilemedi.");
}

// 2. Tarayıcıya "oynatabilirsin" diyoruz (CORS Katili)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/vnd.apple.mpegurl");

// 3. KRİTİK NOKTA: Video parçalarını da proxy'ye yönlendiriyoruz
$base_url = substr($url, 0, strrpos($url, '/') + 1);
// Eğer içerik bir m3u8 listesi ise, içindeki alt linkleri yakalayıp proxy'ye bağla
if (strpos($url, 'm3u8') !== false) {
    $content = preg_replace('/^(?!http|#)(.*)$/m', $base_url . '$1', $content);
}

echo $content;
?>
