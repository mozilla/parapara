<?php
/* vim: set syn=php: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function getUserEmail() {
  if (session_id() == "") {
    session_name(WALLMAKER_SESSION_NAME);
    session_start();
  }
  if (!isset($_SESSION['email'])) {
    throw new KeyedException('logged-out');
  }
  return $_SESSION['email'];
}

function login($assertion) {
  // Destroy any previous session
  session_name(WALLMAKER_SESSION_NAME);
  session_start();
  session_regenerate_id(TRUE);
  $_SESSION = array();
  assert(!isset($_SESSION['email']));

  // Prepare payload
  $payload = array(
    'audience' => $_SERVER['HTTP_HOST'],
    'assertion' => $assertion
  );

  // Send request
  $response = postUrl("https://verifier.login.persona.org/verify", $payload);

  // Check response is valid
  if (!$response) {
    $detail = $response === NULL
            ? "Connection failed"
            : "Empty response";
    error_log("Browser ID fail " . print_r($detail, true));
    throw new KeyedException('login-fail', $detail);
  }

  // Try parsing response
  $response_data = json_decode($response);
  if (!$response_data || !isset($response_data->status)) {
    error_log("Browser ID fail: Invalid response");
    throw new KeyedException('login-fail', "Invalid response");
  }

  // Check the status
  if ($response_data->status == 'failure') {
    throw new KeyedException('login-fail', $response_data->reason);
  }

  $_SESSION['email'] = $response_data->email;

  return $_SESSION['email'];
}

?>
