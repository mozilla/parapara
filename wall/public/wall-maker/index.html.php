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
    <div id="loginError" class="callout" hidden>
    </div>
    <div class="callout loginExplain">
      <p data-l10n-id="persona-explanation"></p>
      <div class="loginButtonLarge">
        <a href="<?php echo $wallMakerRoot ?>/login"
          class="persona-button orange"><span
          data-l10n-id="sign-in">Sign in</span></a>
      </div>
    </div>
  </div>
  <div class="screen" id="screen-home" hidden>
  </div>
  <div class="screen" id="screen-new" hidden>
  </div>
  <!--
  <div class="screen" id="screen-manage" aria-hidden="true">
    <nav aria-role="navigation">
      <a href="<?php echo $wallMakerRoot ?>/"
        class="button left arrow">戻る</a><br>
    </nav>
    <hr>
    <div id="wall-loading" aria-hidden="false">
      <img src="<?php echo $wallMakerRoot?>/img/spinner.gif" class="spinner">
    </div>
    <div id="wall-info" aria-hidden="true">
      <form name="manageWall">
        <section id="wall-summary">
          <div id="wall-thumbnail"></div>
          <div>
            <div class="withIcon"><input type="text" id="manage-name"
              name="name"></div>
            <ul class="urlList">
              <li>
                <label>壁</label>
                <span class="urlDetails">
                  <span class="highlighted-url">
                    <a id="wallUrl"></a>
                    <span id="wallUrlEdit" aria-hidden="true">
                      <span id="wallUrlBase"></span>
                      <input type="text" id="wallPath">
                    </span>
                  </span>
                  <span id="wallUrlViewControls" class="controls">
                    <button
                      type="button" class="icon editUrl" id="editWallUrl" 
                      title="Edit wall URL">Edit</button>
                  </span>
                  <span id="wallUrlSaveControls" class="controls" 
                    aria-hidden="true">
                    <button type="button" class="small" id="saveWallUrl">
                      保存
                    </button>
                    <button type="button" class="small" id="cancelSaveWallUrl">
                      キャンセル
                    </button>
                  </span>
                </span>
              </li>
              <li>
                <label>エディター</label>
                <span class="urlDetails">
                  <span class="highlighted-url">
                    <a id="editorUrl"></a>
                  </span>
                  <span id="shortEditorUrlBlock">
                    or&nbsp;
                    <span class="highlighted-url">
                      <a id="shortEditorUrl"></a>
                    </span>
                    <button type="button" class="icon qrCode"
                      id="showEditorUrlQrCode"
                      title="Show 2D barcode for this URL">QR</button>
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </section>
        <hr>
        <div class="message" aria-hidden="true">
          <div class="messageText"></div>
        </div>
        <div id="wall-details">
          <menu type="toolbar" aria-role="tablist">
            <a href="#session" aria-role="tab"
              aria-controls="manage-session"
              aria-selected="true">セッション</a><a
              href="#design" aria-role="tab"
              aria-controls="manage-design">デザイン</a><a
              href="#gallery" aria-role="tab"
              aria-controls="manage-gallery">ギャラリー</a><a
              href="#location" aria-role="tab"
              aria-controls="manage-location">場所</a><a
              href="#access" aria-role="tab"
              aria-controls="manage-access">アクセス</a><a
              href="#characters" aria-role="tab"
              aria-controls="manage-characters">キャラクター</a>
          </menu>
          <div class="tab-pages">
            <section id="manage-session" aria-role="tabpanel">
              <div class="wallStatus">
                <span class="currentWallStatus"></span>
                <div class="spinnerContainer">
                  <img src="<?php echo $wallMakerRoot?>/img/spinner.gif" 
                    class="spinner">
                </div>
                <div class="latestSession">
                  <label>最新のセッション</label>
                  <span class="latestSessionTime"></span>
                </div>
              </div>
              <div class="sessionButtons">
                <button type="button"
                  id="manage-startSession">新セッションをスタートする</button>
                <button type="button"
                   id="manage-endSession">セッションを終了する</button>
              </div>
              <div class="callout">
                <p>
                  新しいセッションをスタートすると現在見えるキャラクター全てが見えなくなります。
                </p>
                <p>
                  セッションを終了するとこの壁が新しいキャラクターを受け取りません。
                </p>
              </div>
            </section>
            <section id="manage-design" aria-role="tabpanel" aria-hidden="true">
              <div class="designSelection withIcon"></div>
              <div id="durationControls" class="withIcon">
                <label class="inline">一周期間 (秒）</label>
                <input type="range" min=10 max=1200 value=240 step=10
                  id="duration">
                <span id="duration-units">3h30m</span>
                <button type="button" class="small"
                  id="reset-duration">Reset</button>
              </div>
            </section>
            <section id="manage-gallery" aria-role="tabpanel"
              aria-hidden="true">
              <dl>
                <dt>ギャラリーに表示</dt>
                <dd class="alongside">
                  <label>
                    <input type="radio" name="manage-galleryDisplay" value="1"
                      checked>On
                  </label>
                  <label>
                    <input type="radio" name="manage-galleryDisplay" value="0">
                    Off
                  </label>
                  <div class="fieldExplain">ギャラリーの説明</div>
                </dd>
                <dt><label class="optional"
                  for="create-eventDescr">イベントの説明</label></dt>
                <dd>
                  <textarea name="eventDescr" class="eventDescr"
                    id="manage-eventDescr"></textarea>
                </dd>
              </dl>
            </section>
            <section id="manage-location" aria-role="tabpanel"
              aria-hidden="true">
              <dl>
                <dt><label class="optional"
                  for="create-eventLocation">場所</label></dt>
                <dd>
                  <input type="text" name="eventLocation" autocomplete="off"
                   maxlength="255" class="eventLocation"
                   id="manage-eventLocation">
              </dl>
            </section>
            <section id="manage-access" aria-role="tabpanel" 
              aria-hidden="true">
              <dl>
                <dt><label class="optional">エディターのパスコード</label></dt>
                <dd>
                  <input type="password" name="passcode" autocomplete="off"
                   maxlength="50" class="passcode" id="manage-passcode">
                  <div class="fieldExplain">パスコードの説明</div>
                </dd>
                <dt><label class="optional">共同制作者</label></dt>
                <dd>
                  <div class="fieldExplain">共同制作者の説明</div>
                </dd>
              </dl>
            </section>
            <section id="manage-characters" aria-role="tabpanel" 
              aria-hidden="true">
              <h3>セッション１</h3>
              <h3>セッション２</h3>
            </section>
          </div>
        </div>
      </form>
    </div>
  </div>
-->
  <div class="screen" id="screen-load-error" hidden>
    <div class="message error">
      <div class="messageText" data-l10n-id="load-error"></div>
      <button type="button" class="retry" data-l10n-id="retry">Retry</button>
    </div>
  </div>
<!--
  <div class="screen" id="screen-error" hidden>
    <div class="message error">
      <div class="messageText"></div>
      <a href="<?php echo $wallMakerRoot ?>/"
        class="button arrow left center return">戻る</a>
      <button type="button" class="retry"
        onclick="javascript:UserData.updateWalls()">再試行</button>
    </div>
  </div>
-->
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
