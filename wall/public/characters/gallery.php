<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

require_once("../../lib/parapara.inc");
require_once("db.inc");
require_once("characters.inc");
require_once("walls.inc");

// Check for a valid ID
$id = intval($_REQUEST['id']);
if ($id < 1 || !@file_exists($id . '.svg')) {
  $filename = "sad-face.svg";
} else {
  // Load the SVG
  $filename = $id . '.svg';
  $doc = new DOMDocument();
  $doc->load($filename);

  // Parse title and description
  $xpath = new DOMXPath($doc);
  $xpath->registerNamespace('svg', 'http://www.w3.org/2000/svg');
  $titleNodes = $xpath->query('svg:title');
  $title = $titleNodes ? $titleNodes->item(0)->textContent : null;
  $descNodes = $xpath->query('svg:desc');
  $desc = $descNodes ? $descNodes->item(0)->textContent : null;

  // Try to get the event details
  try {
    $char = Characters::getById($id);
    if ($char) {
      if ($char->createDate) {
        $createDate = strtotime($char->createDate);
      }
      $wall = Walls::getById($char->wallId);
    }
    if ($wall) {
      $eventName = $wall->name;
    }
  } catch (KeyedException $e) {
  }
}
?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <title>Parapara Animation</title>
  <link rel="icon" type="image/png" href="favicon.png">
  <style type="text/css">
  body {
    font-family: helvetica;
    color: #333;
  }
  #content {
    max-width: 85%;
    width: 400px;
    margin: 0 auto;
    text-align: center;
  }
  #title {
    font-size: 24px;
    margin: 10px 0px 12px 0px;
  }
  #description {
    margin-top: 3px;
    font-size: 12px;
  }
  #event, #date {
    display: inline-block;
  }
  #characterFrame {
    width: 400px;
    max-width: 100%;
  }
  #character {
    background-color: #ddd;
    -moz-border-radius: 20px;
    -webkit-border-radius: 20px;
    -o-border-radius: 20px;
    -ms-border-radius: 20px;
    border-radius: 20px;
    width: 100%;
    height: 100%;
  }
  #social {
    margin-top: 10px;
  }
  .fb-like {
    position: relative;
    top: -4px;
  }
  @supports (display: flex) and (height: calc(100vh - 10px)) {
    #content {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 10px);
    }
    #content > * {
      flex: none;
    }
    #characterFrame {
      flex: 0 1 auto;
    }
    #character {
      max-width: 100%;
      max-height: auto;
    }
  }
  @media (max-width: 280px) {
    #title {
      font-size: 18px;
    }
  }
  </style>
</head>
<body>
  <div id="content"><?php
if ($title || $desc) {
  echo "\n<div id=\"title\">\n";
  $elems = array();
  if (!empty($title)) array_push($elems, $title);
  if (!empty($desc)) array_push($elems, $desc);
  echo implode($elems, " - ");
  echo "\n</div>\n";
} ?>
    <div id="characterFrame">
      <img id="character" src="<?php echo $filename; ?>">
    </div>
<?php if (!empty($eventName)): ?>
    <div id="description">
      <div id="event"><?php echo $eventName ?></div>
<?php if (!empty($eventName) && !empty($createDate)) echo " / "; ?>
<?php if (!empty($createDate)): ?>
      <div id="date"><?php echo date("Y-m-d", $createDate) ?></div>
<?php endif; ?>
    </div>
<?php endif; ?>

    <div id="social">
      <div class="fb-like" data-href="http://parapara.mozlabs.jp/Fukushima100/characters/<?php echo $id; ?>" data-send="false" data-layout="button_count" data-width="100" data-show-faces="false"></div>   
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
</body>
</html>
