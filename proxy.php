<?php
// proxy.php - CORS Engelini Aşan Köprü
$url = isset($_GET['url']) ? $_GET['url'] : null;

if (!$url) {
    header("HTTP/1.1 400 Bad Request");
    die("Hata: URL belirtilmedi.");
}

// Yayıncı sunucusunu gerçek bir kullanıcı olduğunuza ikna eder
$options = [
    "http" => [
        "method" => "GET",
        "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36\r\n" .
                    "Accept: */*\r\n" .
                    "Referer: https://www.google.com/\r\n"
    ],
    "ssl" => [
        "verify_peer" => false,
        "verify_peer_name" => false,
    ]
];

$context = stream_context_create($options);
$content = @file_get_contents($url, false, $context);

if ($content === false) {
    header("HTTP/1.1 500 Internal Server Error");
    die("Hata: Yayın çekilemedi.");
}

// Tarayıcıya güvenlik izni gönderir
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Content-Type: application/vnd.apple.mpegurl");

echo $content;
?>
