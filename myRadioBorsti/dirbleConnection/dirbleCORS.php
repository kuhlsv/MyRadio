<?php
// Init
$api_key = "efce1a09ec7137f871b4dc9786";
$pagination = $_GET["dirbleRequest"];

// Call
$payload = file_get_contents($pagination);

//  Response
$response = $payload;
echo $response;

?>
