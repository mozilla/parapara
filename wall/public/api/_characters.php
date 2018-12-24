<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('api.inc');
require_once('utils.inc');
require_once('characters.inc');
require_once('login.inc');

// We allow uploading characters from anywhere, so setup CORS headers as needed
if ($_SERVER['REQUEST_METHOD'] == 'POST' ||
    $_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: content-type');
  header('Access-Control-Max-Age: 86400');
}
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS')
  exit;

// Normal request (not OPTIONS)
header('Content-Type: application/json; charset=UTF-8');

// Get wall
$wall = getRequestedWall(getUserEmail());
if (!$wall || $wall == "Not specified") {
  bailWithError('no-wall');
}

// Parse input
$data = getRequestData();

switch ($_SERVER['REQUEST_METHOD']) {
  case 'POST':
    $fields = $data["metadata"];
    $svg    = $data["svg"];
    $char   = Characters::create($svg, $fields, $wall->wallId);
    $result = $char->asArray();

    // Hide email URL field if emailing is not available
    if (!CharacterEmailer::isEmailEnabled()) {
      unset($result['emailUrl']);
    }
    break;

  case 'GET':
    $sessionId = array_key_exists('sessionId', $_REQUEST)
               ? intval($_REQUEST['sessionId']) : null;
    $flatten = create_function('$char', 'return $char->asArray();');
    if ($sessionId) {
      $characters = Characters::getBySession($wall->wallId, $sessionId);
      $result = array_map($flatten, $characters);
    } else {
      $result = $wall->getSessions("Include characters");
      foreach($result as &$session) {
        $session['characters'] = array_map($flatten, $session['characters']);
      }
    }
    break;

  default:
    bailWithError('bad-request');
}

// Return the result
print json_encode($result);

?>
