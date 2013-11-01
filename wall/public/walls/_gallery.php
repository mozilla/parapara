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
  $wallName     = "Parapara Animation";
  $sessionStart = null;
  $thumbnailUrl = null;
  try {
    $wall = Walls::getByPath($_REQUEST['wall']);
    if ($wall) {
      $wallName = htmlspecialchars($wall->name);
      $fullScreenLink = $wall->wallUrl;
      $sessionStart = getSessionStartTime($wall, @$_REQUEST['sessionId']);
      if ($wall->design && $wall->design->thumbnail) {
        $thumbnailUrl = getCurrentServer() . $wall->design->thumbnail;
      }
    }
  } catch (Exception $e) { }

  function getSessionStartTime($wall, $sessionId = null) {
    if (!$wall)
      return null;

    if (!$sessionId)
      return $wall->latestSession ? $wall->latestSession['start'] : null;

    $sessions = $wall->getSessions();
    if (!$sessions)
      return null;

    for ($i = 0; $i < count($sessions); next($sessions), $i++) {
      $session = current($sessions);
      if (intval(@$session['sessionId']) == intval($sessionId))
        return $session['start'];
    }

    return null;
  }
?>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=620, initial-scale=1.0">
    <title><?php echo $wallName ?></title>
    <link rel="stylesheet" href="/css/bootstrap.min.css" media="screen">
    <link rel="stylesheet" href="/css/parapara.css">
    <link rel="stylesheet" href="<?php echo $wallsRoot ?>/css/walls.css">
<?php if ($thumbnailUrl): ?>
    <link rel="image_src" href="<?php echo $thumbnailUrl ?>">
<?php endif; ?>
    <script>
      var Parapara = Parapara || {};
      Parapara.wallName  = '<?php echo @$_REQUEST['wall'] ?>';
      Parapara.sessionId = '<?php echo @$_REQUEST['sessionId'] ?>';
    </script>
    <script data-main="<?php echo $wallsRoot ?>/js/main.js"
      src="/js/lib/require.js"></script>
    <style type="text/css">
      header {
        border-bottom: none;
      }
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
        margin: 60px 0px 12px 0px;
      }
      #description {
        margin-top: 0px;
        margin-bottom: 3px;
        font-size: 12px;
      }
      #full-screen {
        float: left;
      }
      #date {
        float: right;
      }
      #feedbacks {
        padding-top: 3px;
        clear: both;
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
  <div class="top-runner"></div>
  <header>
    <div class="header-contents">
      <nav>
        <a href="http://www.mozilla.org" class="mozilla-tab"><img 
          src="/img/tab.png"></a>
      </nav>
    </div>
  </header>
  <div id="content">
    <div id="title"><?php echo $wallName ?></div>
    <iframe class="wall"></iframe>
    <div id="description">
      <a href="#" id="full-screen">Full-screen</a>
      <time id="date"></time>
    </div>
    <script>
      var loc = document.location;
      var fullScreenLink =
        loc.protocol + '//' + loc.host +
        loc.pathname.replace(/\/gallery$/, "") + loc.search + loc.hash;
      document.getElementById("full-screen").href = fullScreenLink;
    </script>
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
  <script>
    // Fill in date with start of session converted to local time
    var sessionStart = "<?php echo $sessionStart ?>";
    var dateElem = document.getElementById("date");
    if (sessionStart) {
      // Try to convert string to RFC 3339 and parse
      var fixedDateStr = sessionStart.replace(" ", "T") + "+00:00";
      var date = new Date(fixedDateStr);
      if (!isNaN(date.getTime())) {
        dateElem.textContent = date.toLocaleDateString();
        dateElem.setAttribute("datetime", fixedDateStr);
      }
    }
  </script>
</body>
</html>
