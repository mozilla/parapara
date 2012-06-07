<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/parapara.inc");
require_once("../../lib/db.inc");
require_once("../../lib/UriUtils.inc");

$wallId = intval($_GET["wallId"]);
$connection = getConnection();
try {
  $query = "SELECT W.duration AS duration,D.name AS design, D.duration AS defaultduration FROM walls AS W ,designs AS D WHERE W.wallId=$wallId AND D.designId=W.designId";
  $resultset = mysql_query($query, $connection) or throwException(mysql_error());
  if ($row = mysql_fetch_array($resultset)) {
    $duration = intval($row["duration"]);
    $defaultduration = intval($row["defaultduration"]);
    $design = $row["design"];
  } else {
    throwException("no wall found");
  }
  mysql_close($connection);
} catch (Exception $e) {
  header("Content-Type: text/plain; charset=UTF-8");
  $message = $e->getMessage();
  echo "$message\n";
  mysql_close($connection);
  return;
}

header("Content-Type: image/svg+xml; charset=UTF-8");

$walltype = $design;
$templatepath = "./templates/$walltype";
$database = "database4live.js";
$basetime = $duration == 0 ? $defaultduration : $duration;
$timeparts = explode(" ",microtime());
$currentTimeMillis = bcadd(($timeparts[0]*1000),bcmul($timeparts[1],1000));
$begintime = $currentTimeMillis % $basetime;

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
      var BASE_TIME = <?php echo $basetime ?>;
      var BEGIN_TIME = <?php echo $begintime ?>;
      var BEFORE_LOADED_TIME = (new Date()).getTime();
  </script>
  <script xlink:href="js/jquery-1.7.1.min.js"></script>
  <script xlink:href="js/utility.js"></script>
  <script xlink:href="js/<?php echo $database; ?>"></script>
  <script xlink:href="<?php echo $templatepath; ?>/main.js"></script>
  <?php require("$templatepath/wall.svg.inc"); ?>
</svg>