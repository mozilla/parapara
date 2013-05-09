<?php
/* vim: set syn=php: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");
require_once("exceptions.inc");

class CharacterEmailer {
  public static function isEmailEnabled() {
    global $config;
    return strlen(@$config['mail']['transport']) > 0;
  }
}

?>
