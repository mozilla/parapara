<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/parapara.inc");
require_once("UriUtils.inc");
require_once("walls.inc");

$wallsRoot = dirname($_SERVER['SCRIPT_NAME']);

// Get wall name and sessions
try {
  $wall = Walls::getByPath($_REQUEST['wall']);
  $wallName = "Parapara Animation";
  if ($wall) {
    $wallName = htmlspecialchars($wall->name);
    $thumbnail = $wall->thumbnail;
    $sessions = $wall->getSessions();
    $thisWallPath = $wallsRoot . '/' . rawurlencode($wall->urlPath);
    if (!$sessions || empty($sessions)) {
      // No sessions
      $error = "no-sessions";
    } else if (count($sessions) == 1) {
      // Only one session so just redirect to the live page which will show the 
      // latest session
      $latestSessionUrl =
        $wallsRoot . '/' . rawurlencode($wall->urlPath) . '/gallery';
      header("Location: $latestSessionUrl\n\n");
      exit;
    } else {
      // Sort list of sessions latest-first
      $sessions = array_reverse($sessions);
    }
  } else {
    $error = "wall-not-found";
  }
} catch (Exception $e) { $error = "server-error"; }

?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title data-l10n-id="parapara-animation-sessions"><?php echo $wallName 
   ?></title>
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
      <div class="heading"><h1><?php echo $wallName ?></h1></div>
    </div>
  </header>
  <div class="container">
<?php if ($sessions): ?>
    <ul class="thumbnails">
  <?php foreach ($sessions as $session):
    $sessionId = $session['sessionId'];
    $start = $session['start'];
    $end = $session['end'];
    $href = $end
          ? $thisWallPath . '/sessions/' . $sessionId . '/gallery'
          : $thisWallPath . '/gallery';
  ?>
     <li class="session"><a href="<?php echo $href ?>"><div
        class="thumbnail"><?php if ($thumbnail): ?>
        <img src="<?php echo $thumbnail ?>">
      <?php endif; ?>
      <div class="label"><span
        data-l10n-id="session"
        data-l10n-args='{ "id": "<?php echo $sessionId ?>" }'>Session <?php
          echo $sessionId ?></span><div class="subtitle"><time><?php echo $start
          ?></time><?php echo $end ? " ~ <time>$end</time>" : " (running)"
          ?></div></div></div></a></li>
  <?php endforeach; ?>
    </ul>
<?php elseif ($error): ?>
  Error: <?php echo $error ?>
<?php endif; ?>
  </div>
</body>
</html>
