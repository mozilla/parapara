<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");
require_once("exceptions.inc");
require_once("UriUtils.inc");

function addCharacter($wallId, $svg, $title, $author) {
  // Get connection
  $conn =& getDbConnection();

  // Get active session
  $sessionId = getActiveSession($wallId);
  if(!$sessionId) {
    throw new KeyedException('no-active-session');
  }

  // Start transaction
  $trans = $conn->beginTransaction();
  if (PEAR::isError($trans)) {
    error_log($res->getMessage() . ', ' . $res->getDebugInfo());
    throw new KeyedException('db-error');
  }

  // Insert record
  $date = gmdate('Y-m-d H:i:s');
  $query =
    'INSERT INTO characters'
    . ' (sessionId, title, author, y, createDate, active)'
    . ' VALUES '
    . '(' . $conn->quote($sessionId, 'integer')
    . ',' . $conn->quote($title, 'text')
    . ',' . $conn->quote($author, 'text')
    . ',0' // y
    . ',' . $conn->quote($date, 'timestamp')
    . ',TRUE' // active 
    . ')';
  $res =& $conn->query($query);
  if (PEAR::isError($res)) {
    error_log($res->getMessage() . ', ' . $res->getDebugInfo());
    throw new KeyedException('db-error');
  }

  // Get id
  $charId = $conn->lastInsertID('characters', 'charId');
  if (PEAR::isError($charId)) {
    $conn->rollback();
    error_log($res->getMessage() . ', ' . $res->getDebugInfo());
    throw new KeyedException('db-error');
  }

  // Save file
  $svgfilename = getFilenameForId($charId);
  $svgfile = @fopen($svgfilename, 'w');
  if ($svgfile == false) {
    $conn->rollback();
    throw new KeyedException('failed_to_write',
      'このファイルには書き込みできません');
  }
  fwrite($svgfile, $svg);
  fclose($svgfile);

  // Commit transaction
  $conn->commit();

  // Return id
  return $charId;
}

?>
