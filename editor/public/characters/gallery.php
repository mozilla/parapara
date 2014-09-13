<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

require_once("../../lib/php/parapara.inc");
require_once("db.inc");
require_once("characters.inc");

// Check for a valid ID
$id = intval($_REQUEST['id']);
if ($id < 1 || !@file_exists($id . '.svg')) {
  $filename = "sad-face.svg";
  $previewUrl = null;
  $title = null;
  $desc = null;
} else {
  // Load the SVG
  $filename = $id . '.svg';
  $doc = new DOMDocument();
  $doc->load($filename);

  // Parse title and description
  $xpath = new DOMXPath($doc);
  $xpath->registerNamespace('svg', 'http://www.w3.org/2000/svg');
  $titleNodes = $xpath->query('svg:title');
  $title = $titleNodes && $titleNodes->item(0)
         ? $titleNodes->item(0)->textContent : null;
  $descNodes = $xpath->query('svg:desc');
  $desc = $descNodes && $descNodes->item(0)
        ? $descNodes->item(0)->textContent : null;

  // Try to get the character details
  try {
    $char = Characters::getById($id);
    if ($char) {
      if ($char->createDate) {
        $createDate = strtotime($char->createDate);
      }
      $previewUrl = $char->previewUrl;
      $rawUrl = $char->rawUrl;
    }
  } catch (KeyedException $e) { }
}
?>
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title><?php if (!empty($title)) echo "$title @ " ?>Parapara Animation</title>
<?php if ($previewUrl): ?>
  <link rel="image_src" type="image/svg" href="<?php echo $previewUrl ?>">
<?php endif; ?>
  <link rel="stylesheet" href="/css/bootstrap.min.css" media="screen">
  <link rel="stylesheet" href="/css/gallery.css">
  <style type="text/css">
    header {
      border-bottom: none;
    }
    body {
      font-family: helvetica;
      color: #333;
    }
    #content {
      max-width: 85%;
      margin: 60px auto;
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
      margin-left: auto;
      margin-right: auto;
    }
    #character {
      background-color: #ddd;
      -moz-border-radius: 20px;
      -webkit-border-radius: 20px;
      -o-border-radius: 20px;
      -ms-border-radius: 20px;
      border-radius: 20px;
      border: 1px solid black;
      width: 100%;
      height: 100%;
    }
    #social {
      margin-top: 10px;
    }
    iframe.fb-like {
      border: none;
      overflow: hidden;
      width: 100px;
      height: 21px;
      display: inline;
    }
    .code textarea {
      width: 80%;
      padding: 8px;
      border-radius: 8px;
      border-width: 1px;
      background: #eef;
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
    @media (max-width: 380px) {
      .code p {
        font-size: 12px;
      }
    }
    @media (max-width: 280px) {
      #title {
        font-size: 18px;
      }
      .code p {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="top-runner"></div>
  <header>
    <div class="header-contents">
      <nav><a href="http://www.mozilla.org" class="mozilla-tab"><img 
          src="/img/tab.png"></a></nav>
    </div>
  </header>
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
    <div id="description">
<?php if (!empty($createDate)): ?>
      <div id="date"><?php echo date("Y-m-d", $createDate) ?></div>
<?php endif; ?>
    </div>

    <div id="social">
      <!-- Facebook like -->
      <iframe src="https://www.facebook.com/plugins/like.php?href=<?php
        echo rawurlencode(Character::getGalleryUrl($id)) ?>;send=false&amp;layout=button_count&amp;width=100&amp;show_faces=false&amp"
            scrolling="no" frameborder="0" allowTransparency="true"
            class="fb-like"></iframe>
      <!-- Twitter button -->
      <a href="https://twitter.com/share" class="twitter-share-button">Tweet</a>
    </div>
<?php if (!empty($rawUrl)): ?>
    <div class="code">
      <p>Use the following HTML to add this picture to your own web page:</p>
      <textarea cols="100" rows="1">&lt;img width="300" src="<?php echo $rawUrl; ?>"&gt;</textarea>
    </div>
<?php endif; ?>
  </div>
<!-- Twitter script -->
<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');</script>
</body>
</html>
