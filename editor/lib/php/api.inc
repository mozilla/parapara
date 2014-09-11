<?php
/* vim: set syn=php: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Common utility functions for XHR APIs

function bailWithError($code, $detail = null) {
  $result = "{\"error_key\":\"$code\"";
  if ($detail !== null) {
    $result .= ", \"error_detail\":\"$detail\"";
  }
  $result .= "}\n\n";
  print $result;
  exit();
}

function apiExceptionHandler($exception) {
  if (get_class($exception) == "KeyedException") {
    bailWithError($exception->getKey(), $exception->getDetail());
  } else {
    error_log("Uncaught exception: " , $exception->getMessage() . PHP_EOL
              . $exception->getTraceAsString());
    bailWithError("server-error");
  }
}

set_exception_handler('apiExceptionHandler');

function getRequestData() {
  $handle = fopen('php://input','r');
  $jsonString = fgets($handle);
  $json = json_decode($jsonString,true);
  fclose($handle);
  return $json;
}

?>
