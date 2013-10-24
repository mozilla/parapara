<!doctype html>
<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this file,
   - You can obtain one at http://mozilla.org/MPL/2.0/.  -->
<?php
require_once("../lib/parapara.inc");
// We haven't made the editor into a standalone app yet so we just randomly 
// append a wall name to the end and how there's no real wall called that
$editorUrl = @$config['editor']['url'] . 'sandbox';
?>
<html>
<head>
  <meta charset="utf-8">
  <title data-l10n-id="parapara-animation">Parapara Animation</title>
  <link rel="stylesheet" href="/css/bootstrap.min.css" media="screen">
  <link rel="stylesheet" href="/css/parapara.css">
  <link rel="stylesheet" href="/css/top.css">
</head>
<body>
  <div class="top-runner"></div>
  <header>
    <div class="header-contents">
      <!-- Mozilla tab -->
      <nav>
        <a href="http://www.mozilla.org" class="mozilla-tab"><img 
          src="/img/tab.png"></a>
      </nav>
      <!-- Title part -->
      <div class="heading">
        <h1 data-l10n-id="parapara-animation">Parapara Animation</h1>
      </div>
    </div>
  </header>
  <!-- List of links -->
  <ul class="iconList">
    <li><a href="walls/" class="gallery" data-l10n-id="gallery">Gallery</a>
<?php if ($editorUrl): ?>
    <li><a href="<?php echo $editorUrl ?>" class="editor"
      data-l10n-id="draw-an-animation">Draw an animation</a>
<?php endif; ?>
    <!-- XXX This should use HTTPS -->
    <li><a href="wall-maker/" class="wall"
      data-l10n-id="create-a-new-event">Create a new event</a>
  </ul>
</body>
</html>
