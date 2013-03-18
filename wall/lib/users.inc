<?php
/* vim: set syn=php: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");
require_once("db.inc");
require_once("exceptions.inc");

class Users {
  public static function getOrCreateFromEmail($email) {
    // Check if user already exists
    $conn =& getDbConnection();
    $res =& $conn->queryOne(
        'SELECT userId FROM users WHERE email = '
      . $conn->quote($email, 'text')
      . ' LIMIT 1',
      'integer');
    if (PEAR::isError($res)) {
      error_log($res->getMessage() . ', ' . $res->getDebugInfo());
      throw new KeyedException('db-error');
    }

    // If user exists, return the ID
    if ($res >= 1)
      return $res;

    // Otherwise create a new record
    $res =& $conn->query('INSERT INTO users (email) VALUES ('
      . $conn->quote($email, 'text')
      . ')');
    if (PEAR::isError($res)) {
      error_log($res->getMessage() . ', ' . $res->getDebugInfo());
      throw new KeyedException('db-error');
    }

    $userId = $conn->lastInsertID('users', 'userId');
    if (PEAR::isError($userId)) {
      error_log($res->getMessage() . ', ' . $res->getDebugInfo());
      throw new KeyedException('db-error');
    }

    // Return the new ID
    return $userId;
  }
}

?>
