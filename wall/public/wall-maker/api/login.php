<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../../lib/parapara.inc");
require_once("UriUtils.inc");
require_once("api.inc");

header("Content-Type: text/plain; charset=UTF-8");

// Destroy any previous session
session_start();
session_regenerate_id(TRUE);
$_SESSION = array();
assert(!isset($_SESSION['email']));

// Read JSON request
$handle = fopen('php://input','r');
$jsonString = fgets($handle);
$json = json_decode($jsonString,true);
fclose($handle);

// Verify request
if (!strlen(@$json["assertion"])) {
  bailWithError('no-assertion');
}

// Prepare payload
$payload = array(
  'audience' => $_SERVER['HTTP_HOST'],
  'assertion' => $json["assertion"]
);

// Send request
$response = postUrl("https://browserid.org/verify", $payload);

// Check response is valid
if (!$response) {
  $detail = $response === NULL
          ? "Connection failed"
          : "Empty response";
  bailWithError('browserid-fail', $detail);
}

// Try parsing response
$response_data = json_decode($response);
if (!$response_data || !isset($response_data->status)) {
  bailWithError('browserid-fail', "Invalid response");
}

// Check the status
if ($response_data->status == 'failure') {
  bailWithError('login-fail', $response_data->reason);
}

$_SESSION['email'] = $response_data->email;

// Success!
print "{\"email\":\"" . $response_data->email . "\"}";

?>
