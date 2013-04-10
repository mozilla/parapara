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

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS')
  exit;

header('Content-Type: application/json; charset=UTF-8');

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
$metadata = $json["metadata"];
$svg = $json["svg"];

// Check svg isn't empty
if (!strlen($svg)) {
  bailWithError('no-data', 'SVG character is empty');
}

// Run the query
$charId = addCharacter($wallId, $svg, $metadata);

// Prepare result
$result = array('id' => $charId);

// Add URL but only if we are supposed to publish them
// (e.g. we disable publishing URLs when running on an ad-hoc network)
if (!isset($config['characters']) ||
    !isset($config['characters']['publish_url']) ||
    $config['characters']['publish_url'] !== false) {
  $result['url'] = shortenUrl(getGalleryUrlForId($charId));
}

// If email is enabled, provide the URL to use
if (isset($config['mail']) && isset($config['mail']['transport']) &&
    strlen($config['mail']['transport'])) {
  $result['emailUrl'] = fileToUrl("email_anim.php");
}

// Return the result
print json_encode($result);

?>
