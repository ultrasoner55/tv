<?php
// proxy.php
$url = $_GET['url'];

if (!$url) {
    die("URL belirtilmedi.");
}

// Yayıncıya "ben bir tarayıcıyım" diyoruz (User-Agent taklidi)
$options = [
    "http" => [
        "method" => "GET",
        "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n"
    ]
];

$context = stream_context_create($options);
$content = file_get_contents($url, false, $context);

// Tarayıcıya "bu içerik güvenlidir, oynatabilirsin" diyoruz
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/vnd.apple.mpegurl"); // HLS tipi

echo $content;
?>
