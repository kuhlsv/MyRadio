<?php

// prevent the server from timing out
set_time_limit(0);

// include the web sockets server script (the server is started at the far bottom of this file)
require './class.PHPWebSocket.php';

$meineMaxNachrichtenLaenge = 200;


// when a client sends data to the server
function wsOnMessage($clientID, $message, $messageLength, $binary) {
	global $Server;
	global $meineServerURL;
	global $meinServerPort;
	global $meineMaxNachrichtenLaenge;
	
	$ip = long2ip( $Server->wsClients[$clientID][6] );

	// check if message length is 0
	if ($messageLength == 0) {
		$Server->wsClose($clientID);
		return;
	}
	
	
	
	////////////////////////////////////////////////////////////////////////////////////////
	if($messageLength > $meineMaxNachrichtenLaenge) {
		$message = substr($message, 0, $meineMaxNachrichtenLaenge);
//		$message = $message  . "+++Nachricht war laenger als $meineMaxNachrichtenLaenge Zeichen.";
		$messageLength = strlen($message);
		
		// zusaetzlich Nachricht an Sender:
		$Server->wsSend($clientID, "+++Nachricht zu lang. Nur die ersten $meineMaxNachrichtenLaenge Zeichen wurden gesendet.");
	}
	
	//---------------------------------------------------
	if($message == "gibUrlUndPort") {
		$Server->wsSend($clientID, "+++{ \"url\": \"$meineServerURL\", \"port\": $meinServerPort }");
		return;
	}
	////////////////////////////////////////////////////////////////////////////////////////

	//The speaker is the only person in the room. Don't let them feel lonely.
	if ( sizeof($Server->wsClients) == 1 )
		$Server->wsSend($clientID, "+++Zur Zeit ist kein weiterer Client angemeldet.");
	else
		//Send the message to everyone but the person who said it
		foreach ( $Server->wsClients as $id => $client )
			if ( $id != $clientID )
//				$Server->wsSend($id, "Visitor $clientID ($ip) said \"$message\"");
				$Server->wsSend($id, "$message");
}

// when a client connects
function wsOnOpen($clientID)
{
	global $Server;
	global $meineServerURL;
	global $meinServerPort;

	$ip = long2ip( $Server->wsClients[$clientID][6] );

	$Server->log( "$ip ($clientID) has connected." );
	
	// erfolgreiche Verbindung neuem Client melden:
	$Server->wsSend($clientID, "+++Als Client $clientID verbunden mit $meineServerURL:$meinServerPort");

	//Send a join notice to everyone but the person who joined
	foreach ( $Server->wsClients as $id => $client )
		if ( $id != $clientID )
//			$Server->wsSend($id, "Visitor $clientID ($ip) has joined the room.");
			$Server->wsSend($id, "+++Client $clientID (IP: $ip) angemeldet.");
}

// when a client closes or lost connection
function wsOnClose($clientID, $status) {
	global $Server;
	global $meineServerURL;
	global $meinServerPort;

	$ip = long2ip( $Server->wsClients[$clientID][6] );

	$Server->log( "$ip ($clientID) has disconnected." );


	//Send a user left notice to everyone in the room
	foreach ( $Server->wsClients as $id => $client )
//		$Server->wsSend($id, "Visitor $clientID ($ip) has left the room.");
		$Server->wsSend($id, "+++Client $clientID (IP: $ip) abgemeldet.");
}

// start the server

$Server = new PHPWebSocket();
$Server->bind('message', 'wsOnMessage');
$Server->bind('open', 'wsOnOpen');
$Server->bind('close', 'wsOnClose');

// for other computers to connect, you will probably need to change this to your LAN IP or external IP,
// alternatively use: gethostbyaddr(gethostbyname($_SERVER['SERVER_NAME']))

$meineServerURL = "localhost";
$meinServerPort = 8080;

$Server->wsStartServer($meineServerURL, $meinServerPort);

?>