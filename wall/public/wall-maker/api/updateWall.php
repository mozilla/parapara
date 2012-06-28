<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../../lib/parapara.inc');
require_once('api.inc');
require_once('walls.inc');

header('Content-Type: text/plain; charset=UTF-8');

// Check we are logged in
session_name(WALLMAKER_SESSION_NAME);
session_start();
if (!isset($_SESSION['email'])) {
  bailWithError('logged-out');
}

// Parse input
$handle = fopen('php://input','r');
$jsonString = fgets($handle);
$json = json_decode($jsonString,true);
fclose($handle);

// Prepare parameters
$wallId = @$json['wallId'];
$result = "";
if (!isset($wallId)) {
  bailWithError('logged-out');
} else {
  $name = @$json['name'];
  $value = @$json['value'];
  $type = "";
  if ($name === "eventName" || $name === "eventDescr" || $name === "eventLocation" || $name === "passcode") {
    $type = "text";
  } else if ($name === "duration") {
    if (strlen($value) == 0) {
      $value = null;
    } else if (!is_numeric($value)) {
      bailWithError('input is not numeric');
    } else {
      $value = intval($value)*1000;
    }
    $type = "integer";
  } else if ($name === "galleryDisplay" || $name === "designId") {
    if (!is_numeric($value)) {
      bailWithError('input is not numeric');
    }
    $type = "integer";
  } else {
    bailWithError('invalid parameter');
  }
  updateWall($wallId, $name, $value, $type);
  $result = "ok";
}
// Return the result
print json_encode($result);
?>