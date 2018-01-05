<?php
// Init
$api_key = "efce1a09ec7137f871b4dc9786";
$pagination = $_GET["dirbleRequest"];

// Call
$payload = file_get_contents($pagination . "?token=" . $api_key);
//$link = $pagination . "?token=" . $api_key;
//header($link);

//  Response
echo $payload;

?>
