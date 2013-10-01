<!doctype html>
<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this file,
   - You can obtain one at http://mozilla.org/MPL/2.0/.  -->
<?php
  // We have to make everything absolute so that when the access resources from 
  // subdirectories mapped to this file we can still find all the resources
  $wallsRoot = dirname($_SERVER['SCRIPT_NAME']);
?>
<html>
  <head>
    <meta charset="utf-8">
    <title>Parapara Animation loading...</title>
    <script>
      var Parapara = Parapara || {};
      Parapara.wallName  = '<?php echo @$_REQUEST['wall'] ?>';
      Parapara.sessionId = '<?php echo @$_REQUEST['sessionId'] ?>';
    </script>
    <script data-main="<?php echo $wallsRoot ?>/js/main.js"
      src="/js/lib/require.js"></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body, html {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: 0;
      }
    </style>
  </head>
  <body>
    <iframe class="wall"></iframe>
    <div class="error"></div>
  </body>
</html>
