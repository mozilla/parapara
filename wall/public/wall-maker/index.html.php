<!DOCTYPE html>
<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this file,
   - You can obtain one at http://mozilla.org/MPL/2.0/.  -->
<?php
  // We have to make everything absolute so that when the access resources from 
  // e.g. 'server/wall-maker/manage/8' we can still find all the resources
  $wallMakerRoot = dirname($_SERVER['SCRIPT_NAME']);
?>
<html lang="ja">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>パラパラアニメーション・壁の作成・管理</title>
  <link rel="stylesheet" href="/css/parapara.css">
  <link rel="stylesheet"
    href="<?php echo $wallMakerRoot; ?>/css/wall-maker.css">
  <script src="https://login.persona.org/include.js"></script>
  <script>
    var WallMaker = WallMaker || {};
    WallMaker.rootUrl = '<?php echo $wallMakerRoot ?>';
  </script>
  <script src="<?php echo $wallMakerRoot ?>/js/xhr.js"></script>
  <script src="<?php echo $wallMakerRoot ?>/js/login.js"></script>
  <script src="<?php echo $wallMakerRoot ?>/js/wall.js"></script>
  <script src="<?php echo $wallMakerRoot ?>/js/navi.js"></script>
  <script src="<?php echo $wallMakerRoot ?>/js/create-wall.js"></script>
  <script src="<?php echo $wallMakerRoot ?>/js/manage-wall.js"></script>
  <script src="<?php echo $wallMakerRoot ?>/js/login-controller.js"></script>
  <script src="<?php echo $wallMakerRoot ?>/js/ui.js"></script>
</head>
<body>

<div class="top-runner"></div>
<!-- Header -->
<header>
  <div class="header-contents">
    <!-- Login status and Mozilla tab -->
    <nav>
      <div id="loginStatus">
        <div id="loginStatusNo" style="display: none">
          <a href="<?php echo $wallMakerRoot ?>/login" id="browserid"
              title="Mozilla Personaでサインインする">サインイン</a>
        </div>
        <div id="loginStatusYes" style="display: none">
          <span class="login-mail" id="loginMail"></span>
          <span class="logout">(<a href="<?php echo $wallMakerRoot ?>/logout"
            id="logout">Logout</a>)</span>
        </div>
        <div id="loginError" style="display: none">
        </div>
      </div>
      <a href="http://www.mozilla.org" class="mozilla-tab"><img 
        src="/img/tab.png"></a>
    </nav>
    <!-- Title part -->
    <div class="heading">
      <h1>壁メーカー</h1>
    </div>
  </div>
</header>

<div id="page">
  <div class="screen" id="loading" style="display: block">
    <p>Loading&hellip;</p>
  </div>
  <div class="screen" id="loggedOut">
    <div class="callout wallExplain">
      <p>壁の説明</p>
    </div>
    <div class="callout loginExplain">
      <p>ログイン (Mozilla Personaについて説明する)</p>
      <div class="loginButtonLarge">
        <button onclick="javascript:LoginController.login()"
          type="button">Login</button>
      </div>
    </div>
  </div>
  <div class="screen" id="screen-home">
    <a href="<?php echo $wallMakerRoot ?>/new"
      class="button newWallLink">新しい壁を作る</a>
    <hr/>
    <div id="prevWalls">
      <h2>壁の管理</h2>
      <div id="wallList" class="thumbnailGrid"></div>
    </div>
  </div>
  <div class="screen" id="screen-new">
    <div class="error" id="create-error">
      Error message goes here
    </div>
    <form name="createWall" action="javascript:CreateWallController.create()">
      <h2>壁の作成</h2>
      <div class="form-container">
        <h3>タイトル</h3>
        <input type="text" name="eventName" required autocomplete="off"
          maxlength="255" class="eventName" id="create-eventName">
        <h3>背景の選択</h3>
        <div class="designGrid" id="designSelector">
          <label class="graphical">
            <input type="radio" name="design" value="1" required>
            <div class="designThumb">
              <iframe src="<?php
                echo $wallMakerRoot ?>/img/design-1-preview.svg"></iframe>
            </div>
          </label>
          <label class="graphical">
            <input type="radio" name="design" value="2" required>
            <div class="designThumb">
              <iframe src="<?php
                echo $wallMakerRoot ?>/img/design-2-preview.svg"></iframe>
            </div>
          </label>
        </div>
        <div class="center">
          <button type="submit" name="作成" class="submitButton">作成</button>
          <button type="button" class="cancelButton"
            onclick="javascript:CreateWallController.cancel()"
            >キャンセル</button>
        </div>
      </div>
    </form>
  </div>
  <div class="screen" id="screen-manage">
    <nav aria-role="navigation">
      <a href="<?php echo $wallMakerRoot ?>/" class="button">戻る</a>
    </nav>
    <div id="wall-loading" aria-hidden="false">
      Loading&hellip;
    </div>
    <div id="wall-info" aria-hidden="true">
      <section id="wall-summary">
        <h2>イベントの名前</h2>
        <input type="text" id="manage-eventName">
        <ul>
          <li><label class="manage-title">URL</label><label
            id="manage-urlPath" class="manage-value"></label></li>
          <li><label class="manage-title">ショートURL</label><label
            id="manage-shortUrl" class="manage-value"></label></li>
          <li><label class="manage-title">エディタURL</label><label
            id="manage-editorShortUrl" class="manage-value"></label></li>
          <li>チラシのリンク</li>
        </ul>
      </section>
      <div id="wall-details">
        <menu type="toolbar" aria-role="tablist">
          <a href="#event" aria-role="tab" aria-selected="true"
            aria-controls="manage-event">イベント</a><a
            href="#running" aria-role="tab" aria-selected="false"
            aria-controls="manage-running">実行</a><a
            href="#design" aria-role="tab" aria-selected="false"
            aria-controls="manage-design">デザイン</a><a
            href="#privacy" aria-role="tab" aria-selected="false"
            aria-controls="manage-privacy">プライバシー</a><a
            href="#collaboration" aria-role="tab" aria-selected="false"
            aria-controls="manage-collaboration">共同制作</a><a
            href="#characters" aria-role="tab" aria-selected="false"
            aria-controls="manage-characters">キャラクター</a>
        </menu>
        <div class="tab-pages">
          <section id="manage-event" aria-role="tabpanel" aria-hidden="false">
            <dl>
              <dt><label class="optional"
                for="create-eventLocation">場所</label></dt>
              <dd>
                <input type="text" name="eventLocation" autocomplete="off"
                 maxlength="255" class="eventLocation" id="manage-eventLocation">
                <div class="fieldExplain">場所の例</div>
              </dd>
              <dt><label class="optional"
                for="create-eventDescr">イベントの説明</label></dt>
              <dd>
                <textarea name="eventDescr" class="eventDescr"
                  id="manage-eventDescr"></textarea>
              </dd>
            </dl>
          </section>
          <section id="manage-running" aria-role="tabpanel" aria-hidden="true">
            <ul>
              <li>
                <a class="clickable" id="manage-startSession">新セッションをスタートする</a>
                (今のキャラクターが全部見えなくなるよという説明）
              </li>
              <li>
                <a class="clickable" 
                  id="manage-closeSession">セッションを終了する</a>
              </li>
              <li>
                <label class="manage-title">現在のアニメーションスピード</label>
                <input type="number" name="duration" autocomplete="off"
                 maxlength="10" class="duration" id="manage-duration">秒
              </li>
              <li><label class="manage-title">既存のアニメーションスピード</label><label id="manage-defaultDuration" class="manage-value"></label>秒</li>
            </ul>
          </section>
          <section id="manage-design" aria-role="tabpanel" aria-hidden="true">
            <div class="designGrid">
              <p>壁のデザイン：</p>
              <form id="manage-designId">
              <label class="graphical">
                <input type="radio" name="manage-designId" value="1">
                <div class="designThumb">
                  <iframe src="<?php
                    echo $wallMakerRoot ?>/img/design-1-preview.svg"></iframe>
                </div>
              </label>
              <label class="graphical">
                <input type="radio" name="manage-designId" value="2">
                <div class="designThumb">
                  <iframe src="<?php
                    echo $wallMakerRoot ?>/img/design-2-preview.svg"></iframe>
                </div>
              </label>
              </form>
            </div>
          </section>
          <section id="manage-privacy" aria-role="tabpanel" aria-hidden="true">
            <dl>
              <dt>ギャラリーに表示</dt>
              <dd class="alongside">
                <form id="manage-galleryDisplay">
                  <label>
                    <input type="radio" name="manage-galleryDisplay" value="1" checked>
                    On
                  </label>
                  <label>
                    <input type="radio" name="manage-galleryDisplay" value="0">
                    Off
                  </label>
                </form>
                <div class="fieldExplain">ギャラリーの説明</div>
              </dd>
              <dt><label class="optional">エディターのパスコード</label></dt>
              <dd>
                <input type="password" name="passcode" autocomplete="off"
                 maxlength="50" class="passcode" id="manage-passcode">
                <div class="fieldExplain">パスコードの説明</div>
              </dd>
            </dl>
          </section>
          <section id="manage-collaboration" aria-role="tabpanel" 
            aria-hidden="true">
            <dl>
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
      </section>
    </div>
  </div>
  <div class="screen" id="screen-error">
    <div class="error">
    </div>
    <a href="<?php echo $wallMakerRoot ?>/" class="button">戻る</a>
  </div>
</div>
</body>
