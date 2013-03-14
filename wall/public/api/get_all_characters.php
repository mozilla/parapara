<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

header("Content-Type: text/plain; charset=UTF-8");

require_once("../../lib/parapara.inc");
require_once("db.inc");
require_once("api.inc");

$threshold = isset($_GET["threshold"])
           ? intval($_GET["threshold"])
           : null;

$conn =& getDbConnection();

$sessionCond = '';
if (isset($_GET['sessionId'])) {
  $sessionCond = 'sessionId = '
               . $conn->quote(intval($_GET['sessionId']), 'integer');
}

$result = array();

if ($threshold !== null) {
  $query =
    "SELECT charId, x, width, height, groundOffset"
    . " FROM"
    . " (SELECT charId, x, width, height, groundOffset"
    . "  FROM characters WHERE x IS NOT NULL"
    . "  AND active = 1"
    . ($sessionCond ? " AND $sessionCond" : "")
    . "  ORDER BY createDate DESC LIMIT " . $conn->quote($threshold, 'integer')
    . " )"
    . " AS latestShown"
    . " ORDER BY x";
} else {
  $query =
    "SELECT charId, x, width, height, groundOffset"
    . " FROM characters"
    . " WHERE x IS NOT NULL"
    . " AND active = 1"
    . ($sessionCond ? " AND $sessionCond" : "")
    . " ORDER BY x";
}

$res =& $conn->query($query);
if (PEAR::isError($res)) {
  error_log($res->getMessage() . ', ' . $res->getDebugInfo());
  throw new KeyedException('db-error');
}

$conn->setFetchMode(MDB2_FETCHMODE_ASSOC);
while ($row = $res->fetchRow()) {
  $character = array();
  $character["id"] = intval($row["charid"]);
  $character["x"] = intval($row["x"]);
  $character["width"] = intval($row["width"]);
  $character["height"] = intval($row["height"]);
  $character["groundOffset"] = floatval($row["groundoffset"]);
  array_push($result, $character);
}
 
$res->free();
$conn->disconnect();

echo json_encode($result);
?>
