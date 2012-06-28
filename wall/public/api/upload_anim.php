<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/parapara.inc");
require_once("api.inc");
require_once("db.inc");
require_once("UriUtils.inc");
require_once('walls.inc');
require_once('characters.inc');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: content-type');
header('Access-Control-Max-Age: 86400');

header("Content-Type: text/plain; charset=UTF-8");

// Parse wall name
$url = $_SERVER["REDIRECT_URL"];
$match = preg_match('/^\/wall\/([^\/]+)\/upload$/', $url, $matches);
if ($match != 1) {
  bailWithError('no-wall');
}
$wallName = $matches[1];
$wallId = getWallIdFromPath($wallName);
if (!$wallId) {
  bailWithError('no-wall');
}

// Read JSON request
$handle = fopen('php://input','r');
$jsonString = fgets($handle);
$json = json_decode($jsonString,true);
fclose($handle);

// Parse request
$title = $json["title"];
$author = $json["author"];
$svg = $json["svg"];

// Check svg isn't empty
if (!strlen($svg)) {
  bailWithError('no-data', 'SVG character is empty');
}

// Run the query
try {
  $charId = addCharacter($wallId, $svg, $title, $author);
} catch (KeyedException $e) {
  bailWithError($e->getKey(), $e->getDetail());
}

// Prepare result
$url = shortenUrl(getGalleryUrlForId($charId));
$result = array('id' => $charId, 'url' => $url);

// Return the result
print json_encode($result);

?>
