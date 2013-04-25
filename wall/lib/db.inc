<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");
require_once("MDB2.php");
require_once("exceptions.inc");

function getConnection() {
  global $config;
  $connection =
    mysql_connect("127.0.0.1", $config['db']['user'], $config['db']['password'])
    or die(mysql_error());
  mysql_select_db($config['db']['database'], $connection) or die(mysql_error());
  return $connection;
}

function throwException($message = null,$code = null) {
  throw new Exception($message, $code);
}

$conn = null;
function getDbConnection() {
  global $config, $conn;
  if (!$conn) {
    $conn =& MDB2::factory($config['db']['dsn']);
    if (PEAR::isError($conn)) {
      error_log('Error connecting to DB: ' . $conn->getMessage()
                 . ', ' . $conn->getDebugInfo());
      throw new KeyedException('db-error');
    }
  }
  return $conn;
}

function checkDbResult($res, $conn = null) {
  if (PEAR::isError($res)) {
    error_log($res->getMessage() . ', ' . $res->getDebugInfo());
    if ($conn && $conn->inTransaction()) {
      $res->rollback();
    }
    throw new KeyedException('db-error');
  }
}

?>
