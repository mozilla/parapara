<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
try {
  $wallId = getWallIdFromPath($_REQUEST['wall']);
  if (!$wallId) {
    throwException("No wall found");
  }
} catch (Exception $e) {
  header("Content-Type: text/plain; charset=UTF-8");
  $message = $e->getMessage();
  echo "$message\n";
  exit;
}
 */

?>
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Testing</title>
  </head>
  <body>
    <script>
      var wallStream = new EventSource("/api/walls/byname/<?php echo $_REQUEST['wall'] ?>/live");
      wallStream.onopen = function(e) {
        console.log("Stream opened");
      };
      wallStream.onerror = function(e) {
        console.log("Stream closed");
      };
      wallStream.onmessage = function(e) {
        console.log("message");
        console.log(e);
      };
      wallStream.addEventListener("start-session", genericEventHandler);
      wallStream.addEventListener("add-character", genericEventHandler);
      wallStream.addEventListener("remove-character", genericEventHandler);
      wallStream.addEventListener("change-design", genericEventHandler);
      wallStream.addEventListener("change-duration", genericEventHandler);
      wallStream.addEventListener("remove-wall", genericEventHandler);

      function genericEventHandler(e) {
        console.log(e.type);
        console.log(e);
      }
    </script>
  </body>
</html>
