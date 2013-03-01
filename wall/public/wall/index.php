<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/parapara.inc");
require_once("db.inc");
require_once("UriUtils.inc");
require_once("walls.inc");

$conn = NULL;
try {
  // Parse wall name
  $url = $_SERVER["REDIRECT_URL"];
  $match = preg_match('/^\/wall\/([^\/]+)$/', $url, $matches);
  if ($match != 1) {
    throwException("No wall found");
  }
  $wallName = $matches[1];
  $wallId = getWallIdFromPath($wallName);
  if (!$wallId) {
    throwException("No wall found");
  }
  $conn = getDbConnection();

  $query = "SELECT D.name AS design"
         . ", S.sessionId AS sessionId"
         . ", S.endDate AS endDate"
         . " FROM walls AS W"
         . ", designs AS D"
         . ", sessions AS S"
         . " WHERE W.wallId=$wallId"
           . " AND D.designId=W.designId"
           . " AND W.wallId=S.wallId"
         . " ORDER BY S.sessionId DESC LIMIT 1";
  $row =& $conn->queryRow($query, null, MDB2_FETCHMODE_ASSOC);
  error_log(print_r($row, true));
  $conn->disconnect();
  $conn = null;

  if (PEAR::isError($row)) {
    error_log($row->getMessage() . ', ' . $row->getDebugInfo());
    throwException("No wall found");
  }

  $design = $row["design"];
  $endDate = $row["enddate"];
  $sessionId = $row["sessionid"];

} catch (Exception $e) {
  header("Content-Type: text/plain; charset=UTF-8");
  $message = $e->getMessage();
  echo "$message\n";
  if ($conn) {
    $conn->disconnect();
  }
  return;
}

header("Content-Type: image/svg+xml; charset=UTF-8");

$database   = $endDate == NULL ? "database4live.js" : "database4gallery.js";
$duration   = getWallDuration($wallId);
$beginTime  = getCurrentWallTimeForDuration($duration);

?>
<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"
  "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg preserveAspectRatio="none"
  xmlns="http://www.w3.org/2000/svg" version="1.1"
  xmlns:xlink="http://www.w3.org/1999/xlink">
  <script>
      var WALL_ID = <?php echo $wallId ?>;
      var SESSION_ID = <?php echo $sessionId ?>;
      var BASE_TIME = <?php echo $duration ?>;
      var BEGIN_TIME = <?php echo $beginTime ?>;
      var BEFORE_LOADED_TIME = (new Date()).getTime();
  </script>
  <script xlink:href="js/jquery-1.7.1.min.js"></script>
  <script xlink:href="js/utility.js"></script>
  <script xlink:href="js/<?php echo $database; ?>"></script>
  <script xlink:href="/designs/<?php echo $design; ?>/main.js"></script>
  <g xml:base="/designs/<?php echo $design; ?>/">
    <?php require("../designs/$design/wall.svg.inc"); ?>
  </g>
</svg>
