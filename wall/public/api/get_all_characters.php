<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

header("Content-Type: text/plain; charset=UTF-8");

require_once("../../lib/parapara.inc");
require_once("db.inc");
$connection = getConnection();

$threshold = isset($_GET["threshold"]) ? intval($_GET["threshold"]) : -1;

$list = array();
try {
  if (!isset($_GET["wallId"])) {
    throwException("no wall id");
  }
  $wallId = intval($_GET["wallId"]);

  if ($threshold >= 0) {
    $query = "SELECT charId,x,y FROM " .
      "(SELECT charId,x,y FROM characters WHERE x IS NOT NULL AND active = 1 AND wallId=".$wallId.
      " ORDER BY createDate DESC LIMIT " . $threshold . ") " .
      "AS latestShown ORDER BY x";
  } else {
    $query =
      "SELECT charId,x,y FROM characters WHERE x IS NOT NULL AND active = 1" .
      " ORDER BY x";
  }
  $resultset = mysql_query($query, $connection) or
               throwException(mysql_error());

  while ($row = mysql_fetch_array($resultset)) {
    $character = array();
    $character["id"] = intval($row["charId"]);
    $character["x"] = intval($row["x"]);
    $character["y"] = intval($row["y"]);
    array_push($list, $character);
  }
  
  mysql_free_result($resultset);
} catch (Exception $e) {
  $list["error"] = $e->getMessage();
}
mysql_close($connection);

echo json_encode($list);
?>
