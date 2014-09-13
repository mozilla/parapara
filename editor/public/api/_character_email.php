<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/php/parapara.inc');
require_once('api.inc');
require_once('characters.inc');

if ($_SERVER['REQUEST_METHOD'] != 'POST' &&
    $_SERVER['REQUEST_METHOD'] != 'OPTIONS')
  exit;

// We allow emailing characters from anywhere, so setup CORS headers as needed
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: content-type');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS')
  exit;

header('Content-Type: application/json; charset=UTF-8');

// Get character
$charId = toIntOrNull(@$_REQUEST['charId']);
if (!$charId)
  bailWithError('char-not-found', $charId);
$char = Characters::getById($charId);
if (!$char)
  bailWithError('char-not-found', $charId);

// Parse input
$data    = getRequestData();
$address = @$data["address"];
$locale  = @$data["locale"];

// Send away
CharacterEmailer::sendEmail($char, $address, $locale);

print "{}"; // Success, empty response

?>
