<!doctype html>
<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this file,
   - You can obtain one at http://mozilla.org/MPL/2.0/.  -->
<?php
  // We have to make everything absolute so that when the access resources from 
  // e.g. 'server/wall-maker/manage/8' we can still find all the resources
  $wallMakerRoot = dirname($_SERVER['SCRIPT_NAME']);
?>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title data-l10n-id="page-title">Parapara Animation Wall Maker</title>
  <link rel="stylesheet" href="/css/bootstrap.min.css" media="screen">
  <link rel="stylesheet" href="/css/parapara.css">
  <link rel="stylesheet"
    href="<?php echo $wallMakerRoot; ?>/css/wall-maker.css">
  <link rel="stylesheet"
    href="<?php echo $wallMakerRoot; ?>/css/persona.css">
  <link rel="resource" type="application/l10n"
    href="<?php echo $wallMakerRoot; ?>/locales/locales.ini">
  <script src="https://login.persona.org/include.js"></script>
  <script>
    var WallMaker = WallMaker || {};
    WallMaker.rootUrl = '<?php echo $wallMakerRoot ?>';
  </script>
  <script data-main="<?php echo $wallMakerRoot ?>/js/main.js"
    src="/js/lib/require.js"></script>
  <meta name="viewport" content="width=580, initial-scale=1.0">
</head>
<body>

<div class="top-runner"></div>
<!-- Header -->
<header>
  <div class="header-contents">
    <!-- Login status and Mozilla tab -->
    <nav>
      <div id="loginStatus">
      </div>
      <a href="http://www.mozilla.org" class="mozilla-tab"><img 
        src="/img/tab.png"></a>
    </nav>
    <!-- Title part -->
    <div class="heading">
      <h1 data-l10n-id="page-heading">Wall maker</h1>
    </div>
  </div>
</header>

<div id="page" class="container">
  <div class="screen" id="screen-loading">
    <img src="<?php echo $wallMakerRoot?>/img/spinner.gif" class="spinner">
  </div>
  <div class="screen" id="screen-login" hidden>
    <div id="loginError" class="alert" hidden></div>
    <div class="callout loginExplain">
      <p data-l10n-id="persona-explanation"></p>
      <div class="loginButtonLarge">
        <a href="<?php echo $wallMakerRoot ?>/login"
          class="persona-button orange"><span
          data-l10n-id="sign-in">Sign in</span></a>
      </div>
    </div>
  </div>
  <div class="screen" id="screen-error" hidden>
    <div class="alert alert-block"></div>
  </div>
</div>
<footer>
  <form class="form-inline">
    <label for="lang" data-l10n-id="other-lang">Other languages</label>
    <select id="lang" name="lang" dir="ltr" class="input-medium">
      <option lang="en" value="en">English</option>
      <option lang="ja" value="ja">日本語</option>
    </select>
  </form>
</footer>
<div class="overlay" hidden>
  <div class="container">
    <div class="content" id="qrCode">
      <img>
      <div class="link"></div>
      <button type="button">OK</button>
    </div>
  <div>
</div>
</body>
