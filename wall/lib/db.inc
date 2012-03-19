<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function getConnection() {
  $connection =
    mysql_connect("127.0.0.1", DB_USER, DB_PASS) or die(mysql_error());
  mysql_select_db(DB_NAME, $connection) or die(mysql_error());
  return $connection;
}

function throwException($message = null,$code = null) {
  throw new Exception($message, $code);
}
?>
