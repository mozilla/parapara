<!doctype html>
<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this file,
   - You can obtain one at http://mozilla.org/MPL/2.0/.  -->
<?php

require_once("../../lib/parapara.inc");
require_once("UriUtils.inc");
require_once("walls.inc");

function activeFirst($a, $b) {
  if (isset($a->latestSession) && isset($b->latestSession)) {
    $startA = $a->latestSession['start'];
    $startB = $b->latestSession['start'];
    if ($startA == $startB) {
      return $a->wallId > $b->wallId ? -1 : 1;
    }
    return strtotime($startA) > strtotime($startB) ? -1 : 1;
  } else if (isset($a->latestSession) && !isset($b->latestSession)) {
    return -1;
  } else if (!isset($a->latestSession) && isset($b->latestSession)) {
    return 1;
  } else {
    return $a->wallId > $b->wallId ? -1 : 1;
  }
}

$walls = Walls::getAllPublic();
usort($walls, "activeFirst");
?>
<html>
  <body>
    <ul>
<?php
  foreach ($walls as $wall):
    $name = htmlspecialchars($wall->name);
    $href = "/walls/" . rawurlencode($wall->urlPath) . "/sessions";
    $thumbnail = $wall->thumbnail;
    $date = @$wall->latestSession['start'];
?>
     <li><a href="<?php echo $href ?>"><img src="<?php echo $thumbnail
       ?>"><?php echo $name ?><?php if ($date) echo " - $date" ?></a></li>
<?php
  endforeach;
?>
    </ul>
  </body>
</html>
