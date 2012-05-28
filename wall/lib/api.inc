<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Common utility functions for XHR APIs

function bailWithError($code, $detail = NULL) {
  $result = "{\"error_key\":\"$code\"";
  if ($detail) {
    $result .= ", " .  "\"error_detail\":\"$detail\"";
  }
  $result .= "}\n\n";
  print $result;
  exit();
}

?>
