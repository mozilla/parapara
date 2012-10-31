<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/parapara.inc");
require_once("../../lib/db.inc");
require_once("../../lib/UriUtils.inc");
require_once("../../lib/walls.inc");

$connection = NULL;
try {
  // Parse wall name
  $url = $_SERVER["REDIRECT_URL"];
  $match = preg_match('/^\/wall\/([^\/]+)$/', $url, $matches);
  if ($match != 1) {
    throwException("no wall found");
  }
  $wallName = $matches[1];
  $wallId = getWallIdFromPath($wallName);
  if (!$wallId) {
    throwException("no wall found");
  }
  $connection = getConnection();

  $query = "SELECT D.name AS design, S.sessionId AS sessionId, S.endDate AS endDate FROM walls AS W ,designs AS D, sessions AS S WHERE W.wallId=$wallId AND D.designId=W.designId AND W.wallId=S.wallId ORDER BY S.sessionId DESC LIMIT 1";
  $resultset = mysql_query($query, $connection) or throwException(mysql_error());
  if ($row = mysql_fetch_array($resultset)) {
    $design = $row["design"];
    $endDate = $row["endDate"];
    $sessionId = $row["sessionId"];
  } else {
    throwException("no wall found");
  }
  mysql_close($connection);
} catch (Exception $e) {
  header("Content-Type: text/plain; charset=UTF-8");
  $message = $e->getMessage();
  echo "$message\n";
  if ($connection) {
    mysql_close($connection);
  }
  return;
}

header("Content-Type: image/svg+xml; charset=UTF-8");

$walltype = $design;
$templatepath = "./templates/$walltype";
$database = $endDate == NULL ? "database4live.js" : "database4gallery.js";
$duration = getWallDuration($wallId);
$beginTime = getCurrentWallTimeForDuration($duration);

?>
<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"
  "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg
   preserveAspectRatio="none"
     xmlns="http://www.w3.org/2000/svg" version="1.1"
     xmlns:xlink="http://www.w3.org/1999/xlink"
  >
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
  <script xlink:href="<?php echo $templatepath; ?>/main.js"></script>
  <?php require("$templatepath/wall.svg.inc"); ?>
</svg>
