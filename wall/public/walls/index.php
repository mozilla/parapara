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
<head>
  <meta charset="utf-8">
  <title data-l10n-id="parapara-animation-galleries">Parapara Animation
    galleries</title>
  <link rel="stylesheet" href="/css/bootstrap.min.css" media="screen">
  <link rel="stylesheet" href="/css/parapara.css">
</head>
<body>
  <div class="top-runner"></div>
  <header>
    <div class="header-contents">
      <nav>
        <a href="http://www.mozilla.org" class="mozilla-tab"><img 
          src="/img/tab.png"></a>
      </nav>
      <div class="heading"><h1 data-l10n-id="gallery">Gallery</h1></div>
    </div>
  </header>
  <div class="container">
    <ul class="thumbnails">
<?php
  foreach ($walls as $wall):
    $name = htmlspecialchars($wall->name);
    $href = "/walls/" . rawurlencode($wall->urlPath) . "/sessions";
    $thumbnail = $wall->thumbnail;
    $date = @$wall->latestSession['start'];
?>
     <li class="span4"><div class="thumbnail"><a href="<?php echo $href ?>"><img src="<?php echo $thumbnail
       ?>"><div class="label"><?php echo $name ?><?php
         if ($date) echo '<time class="subtitle">' . $date . '</time>'
       ?></div></a></div></li>
<?php
  endforeach;
?>
      </ul>
    </div>
  </body>
</html>
