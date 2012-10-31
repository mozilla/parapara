<?php
/* vim: set syn=php: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");
require_once("db.inc");

// Get the design for a wall given a path
// Currently returns an associative array with only the design name ('name')
function getDesignForWallPath($path) {
  $conn =& getDbConnection();
  $res =& $conn->queryRow(
      'SELECT name FROM designs'
    . ' INNER JOIN walls ON designs.designId = walls.designId'
    . ' WHERE walls.urlPath = ' . $conn->quote(rawurlencode($path), 'text')
    . ' LIMIT 1',
    null,
    MDB2_FETCHMODE_ASSOC);

  if (PEAR::isError($res)) {
    error_log($res->getMessage() . ', ' . $res->getDebugInfo());
    throw new KeyedException('db-error');
  }
  return $res ? $res : null;
}

function getEditorStyleSheetForDesign($designName) {
  // Sanitize designName
  $designName = basename($designName);

  // Work out where the stylesheet *should* be
  $styleSheetPath = "wall/templates/$designName/editor/editor.css";
  $baseDir = dirname(__FILE__) . '/../public/';
  $fsPath = $baseDir . $styleSheetPath;

  // Check if it exists
  return file_exists($fsPath) ? $styleSheetPath : null;
}

?>
