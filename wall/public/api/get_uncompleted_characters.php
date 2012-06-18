<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

header("Content-Type: text/plain; charset=UTF-8");

require_once("../../lib/parapara.inc");
require_once("db.inc");
$connection = getConnection();


$list = array();
try {
  if (!isset($_GET["sessionId"])) {
    throwException("no session id");
  }
  if (!isset($_GET["x"])) {
    throwException("no x");
  }
  $x = intval($_GET["x"]);
  $sessionId = intval($_GET["sessionId"]);

  $query =
    "SELECT charId,title,author,y FROM characters WHERE x IS NULL AND active = 1 AND sessionId=".$sessionId;
  $resultset = mysql_query($query, $connection) or
               throwException(mysql_error());

  $ids = "";
  while ($row = mysql_fetch_array($resultset)) {
    $character = array();
    $id = intval($row["charId"]);
    $character["id"] = $id;
    $character["title"] = $row["title"];
    $character["author"] = $row["author"];
    $character["y"] = intval($row["y"]);
    $character["x"] = $x;
    array_push($list, $character);
    if (strlen($ids) != 0) {
      $ids .= ",";
    }
    $ids .= $id;
  }
  mysql_free_result($resultset);
  // Update
  if (strlen($ids) != 0) {
    $query4update = "UPDATE characters set x=$x WHERE charId IN ($ids)";
    mysql_query($query4update, $connection) or throwException(mysql_error());
  } 
} catch (Exception $e) {
  $list["error"] = $e->getMessage();
}
mysql_close($connection);

echo json_encode($list);
?>
