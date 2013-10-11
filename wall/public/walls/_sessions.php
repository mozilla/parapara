<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/parapara.inc");
require_once("UriUtils.inc");
require_once("walls.inc");

$wallsRoot = dirname($_SERVER['SCRIPT_NAME']);

// Get sessions
try {
  $wall = Walls::getByPath($_REQUEST['wall']);
  if ($wall) {
    $sessions = $wall->getSessions();
    if (!$sessions || empty($sessions)) {
      // No sessions
      $error = "no-sessions";
    } else if (count($sessions) == 1) {
      // Only one session so just redirect to it
      $latestSessionUrl =
        $wallsRoot . '/' . rawurlencode($wall->urlPath)
        . '/sessions/' . $sessions[0]['sessionId'] . '/gallery';
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
  <body>
<?php if ($sessions): ?>
    <ul>
  <?php foreach ($sessions as $session):
    $sessionId = $session['sessionId'];
    $href = $wallsRoot . '/' . rawurlencode($wall->urlPath)
          . '/sessions/' . $sessionId . '/gallery';
    $start = $session['start'];
    $end = $session['end'];
  ?>
     <li><a href="<?php echo $href ?>"<span data-l10n-id="session"
        data-l10n-args='{ "id": "<?php echo $sessionId ?>" }'>Session <?php
          echo $sessionId ?></span> - <?php echo $start ?><?php 
          echo $end ? " ~ $end" : " (running)" ?></a></li>
  <?php endforeach; ?>
    </ul>
<?php elseif ($error): ?>
  Error: <?php echo $error ?>
<?php endif; ?>
  </body>
</html>
