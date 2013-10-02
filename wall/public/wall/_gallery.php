<!doctype html>
<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this file,
   - You can obtain one at http://mozilla.org/MPL/2.0/.  -->
<?php

require_once("../../lib/parapara.inc");
require_once("UriUtils.inc");
require_once("walls.inc");

  // We have to make everything absolute so that when the access resources from 
  // subdirectories mapped to this file we can still find all the resources
  $wallsRoot = dirname($_SERVER['SCRIPT_NAME']);
  $thisUrl   = getCurrentServer() . $_SERVER['REQUEST_URI'];

  // Get wall details
  $wallName = "Parapara Animation";
  try {
    $wall = Walls::getByPath($_REQUEST['wall']);
    if ($wall) {
      $wallName = htmlspecialchars($wall->name);
    }
  } catch (Exception $e) { }
?>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=620, initial-scale=1.0">
    <title><?php echo $wallName ?></title>
    <link rel="stylesheet" href="<?php echo $wallsRoot; ?>/css/walls.css">
    <script>
      var Parapara = Parapara || {};
      Parapara.wallName  = '<?php echo @$_REQUEST['wall'] ?>';
      Parapara.sessionId = '<?php echo @$_REQUEST['sessionId'] ?>';
    </script>
    <script data-main="<?php echo $wallsRoot ?>/js/main.js"
      src="/js/lib/require.js"></script>
    <style type="text/css">
      body {
        font-family: helvetica;
        color: #333;
      }
      #content {
        position: relative;
        width: 600px;
        max-width: 90%;
        margin: 0 auto;
      }
      #title {
        font-size: 24px;
        margin: 18px 0px 12px 0px;
      }
      #description {
        margin-top: 3px;
        text-align: right;
        font-size: 12px;
      }
      #date {
        display: inline-block;
      }
      iframe.wall {
        width: 100%;
        height: 388px;
        border: 1px solid black;
        border-radius: 10px;
        -webkit-border-radius: 10px;
        -o-border-radius: 10px;
        -ms-border-radius: 10px;
      }
      .fb-like {
        position: relative;
        top: -4px;
      }

      /* Hide all the above if the document is in error */
      .error #content {
        display: none;
      }
    </style>
  </head>
  <body>
  <div id="content">
    <div id="title"><?php echo $wallName ?></div>
    <iframe class="wall"></iframe>
    <div id="description">
      <!-- XXX Fill this in -->
      <div id="date">2012/03/25</div>
    </div>
    <div id="feedbacks">
      <div class="fb-like"
        data-href="<?php echo $thisUrl ?>"
        data-width="100" data-layout="button_count" data-show-faces="false"
        data-send="false"></div>
      <a href="https://twitter.com/share" class="twitter-share-button">Tweet</a>
    </div>    
    
    <script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>
    <div id="fb-root"></div>
    <script>(function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "//connect.facebook.net/ja_JP/all.js#xfbml=1";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));</script>
  </div>
  <div class="error"></div>
</body>
</html>
