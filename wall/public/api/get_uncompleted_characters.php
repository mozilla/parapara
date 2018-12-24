<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

header("Content-Type: application/json; charset=UTF-8");

require_once("../../lib/parapara.inc");
require_once("db.inc");
require_once("utils.inc");
$connection = getConnection();

$list = array();
try {
  $wallId = toIntOrNull($_GET["wallId"]);
  if (!$wallId || $wallId < 1) {
    throwException("no wall id");
  }
  $sessionId = toIntOrNull($_GET["sessionId"]);
  if (!$sessionId || $sessionId < 1) {
    throwException("no session id");
  }
  $charId = toIntOrNull($_GET["charId"]);
  if ($charId === null || $charId < 0) {
    throwException("no char id");
  }

  $query =
    "SELECT charId,title,author,x,width,height,groundOffset FROM characters"
    . " WHERE charId > " . $charId
    . " AND wallId=" . $wallId
    . " AND sessionId=" . $sessionId
    . " AND active = 1";
  $resultset = mysql_query($query, $connection) or throwException(mysql_error());

  $ids = "";
  while ($row = mysql_fetch_array($resultset)) {
    $character = array();
    $id = intval($row["charId"]);
    $character["id"] = $id;
    $character["title"] = $row["title"];
    $character["author"] = $row["author"];
    $character["x"] = intval($row["x"]);
    $character["width"] = intval($row["width"]);
    $character["height"] = intval($row["height"]);
    $character["groundOffset"] = floatval($row["groundOffset"]);
    array_push($list, $character);
    if (strlen($ids) != 0) {
      $ids .= ",";
    }
    $ids .= $id;
  }
  mysql_free_result($resultset);
} catch (Exception $e) {
  $list["error"] = $e->getMessage();
}
mysql_close($connection);

echo json_encode($list);
?>
