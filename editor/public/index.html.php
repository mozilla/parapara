<!DOCTYPE html>
<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this file,
   - You can obtain one at http://mozilla.org/MPL/2.0/.  -->
<html>
  <head>
    <meta charset="utf-8">
    <title data-l10n-id="title">Parapara Animation</title>
    <link rel="stylesheet" href="css/parapara.css" type="text/css">
    <link rel="stylesheet" href="css/editor.css" type="text/css">
<?php
  require_once("../lib/php/editor-util.inc");
  $stylesheet = getStylesheet();
  if ($stylesheet) {
    echo '    <link rel="stylesheet" href="' .  $stylesheet .
         '" type="text/css">' . PHP_EOL;
  }
?>
    <link rel="resource" type="application/l10n" href="locales.ini">
    <script type="text/javascript" src="js/l10n.js"></script>
    <script type="text/javascript" src="js/parapara.core.js" defer></script>
    <script type="text/javascript" src="js/editor-ui.js"></script>
    <script type="text/javascript" src="js/qrcode.js" async></script>
    <meta name="viewport" content="width=device-width, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style"
      content="black-translucent">
  </head>
  <body>
    <div class="container" id="container">
      <div class="controlPanel tool-box">
        <div class="inner-border"><iframe src="img/tool-picker.svg" 
          class="panelContents"
            id="picker"></iframe><iframe src="img/width-picker.svg" 
          class="panelContents" id="widths"></iframe><iframe 
            src="img/play.svg" class="panelContents" id="play"></iframe></div>
      </div>
      <div class="canvas-container">
        <div class="controlPanel film-strip">
          <iframe src="img/filmstrip.svg" height="100%"
            id="filmstrip"></iframe>
          <nav class="settingsMenu" role="navigation">
            <details>
              <summary>
                <span class="langSummary" lang=en id=langSummary>English</span>
              </summary>
              <menu>
                <li aria-checked=false aria-role=menuitemcheckbox
                  data-l10n-id="fullscreen" id="full-screen-menu">Fullscreen
                <li class=lang aria-checked=true aria-role=menuitemradio 
                  lang=en>English
                <li class=lang aria-checked=false aria-role=menuitemradio 
                  lang=ja>日本語
              </menu>
            </details>
          </nav>
        </div>
        <div class="canvas-background">
          <svg viewBox="0 0 300 300" id="canvas">
           <g id="parapara"/>
          </svg>
        </div>
        <div id="anim-controls">
         <div id="slower">
          <svg width="100%" height="100%" viewBox="0 0 100 200"
           preserveAspectRatio="xMinYMid">
           <circle cx="0" cy="100" r="100" class="overlay-shading"/>
           <path d="m44 85l-30 15l30 15zm30 0l-30 15l30 15z"
            class="overlay-icon"/>
          </svg>
         </div>
         <div id="faster">
          <svg width="100%" height="100%" viewBox="0 0 100 200"
           preserveAspectRatio="xMaxYMid">
           <circle cx="100" cy="100" r="100" class="overlay-shading"/>
           <path d="m26 85l30 15l-30 15zm30 0l30 15l-30 15z"
            class="overlay-icon"/>
          </svg>
         </div>
         <div id="send">
           <svg width="100%" height="100%" viewBox="0 0 100 100"
            preserveAspectRatio="xMaxYMax">
            <circle cx="100" cy="100" r="100" class="overlay-shading"/>
            <text fill="black" text-anchor="end"
             x="91" y="81" font-size="25" data-l10n-id="complete">OK</text>
            <text class="overlay-icon" text-anchor="end"
             x="90" y="80" font-size="25" data-l10n-id="complete">OK</text>
           </svg>
         </div>
        </div>
      </div>
    </div>
    <div class="overlay" id="overlay" style="display:none">
      <div class="overlay-inner">
        <div class="overlay-contents" id="noteMetadata"
          style="padding-top: 1.2em; padding-bottom: 1em">
          <span data-l10n-id="add-title">Add a title</span>
          <form id="metadata-form">
            <div class="field-row">
              <input type="text" name="title" id="title" size="23"
                autocomplete="off" placeholder="Title"
                data-l10n-id="anim-title">
            </div>
            <div class="field-row">
              <input type="text" name="name" id="name" size="23"
                autocomplete="off" placeholder="Your name"
                data-l10n-id="anim-author">
            </div>
          </form>
          <button type="submit" class="text" id="metadata-button"
            onclick="EditorUI.clearNote(); EditorUI.send()"
            data-l10n-id="send">Send</button>
          <button type="button" class="text" data-l10n-id="cancel"
            onclick="EditorUI.returnToAnimation()">Cancel</button>
        </div>
        <div class="overlay-contents" id="noteSending">
          <span data-l10n-id="sending">Sending</span><br><br>
          <img src="img/loader.gif" width="43" height="11"
            alt="Sending" data-l10n-id="sending-graphic">
        </div>
        <div class="overlay-contents" id="noteSendingComplete"
          data-l10n-id="send-success">Animation sent!
        </div>
        <div class="overlay-contents" id="noteShare"
          style="padding-top: 1.2em; padding-bottom: 1em">
          <span data-l10n-id="share-title">Let's share your animation!</span>
          <form id="email-form" action="javascript:EditorUI.sendEmail()">
            <div class="field-row">
              <input type="email" name="email" id="email" size="23"
                style="ime-mode: inactive" autocomplete="off"
                data-l10n-id="email" placeholder="e.g. parapara@gmail.com">
              <button type="submit" class="text" id="email-button">
                <img src="img/email.png" width="16" height="16">
              </button>
              <div id="email-progress" class="async-progress"></div>
            </div>
            <div class="field-note" id="spam-filter-note"
              data-l10n-id="spam-filter-note"
              data-l10n-args='{ "send.domain": "mozilla-japan.org" }'></div>
            <input type="hidden" name="animation-id">
            <input type="hidden" name="email-url">
          </form>
          <div id="animation-link">
            <!-- The content here is dynamically inserted -->
          </div>
          <button type="button" class="text" style="margin-top: 0.6em"
            onclick="EditorUI.clearNoteAndReset()" data-l10n-id="ok">OK</button>
        </div>
        <div class="overlay-contents error" id="noteSendingFailed">
          <span data-l10n-id="sending-failed">Sending failed</span><br><br>
          <button type="button" class="text" data-l10n-id="cancel"
            onclick="EditorUI.clearNoteAndReset()">Cancel</button>
          <button type="button" class="text" data-l10n-id="resend"
            onclick="EditorUI.send()">Resend</button>
        </div>
        <div class="overlay-contents error" id="noteSendingFailedFatal">
          <span data-l10n-id="sending-failed">Sending failed</span><br><br>
          <button type="button" class="text" data-l10n-id="ok"
            onclick="EditorUI.clearNoteAndReset()">OK</button>
        </div>
        <div class="overlay-contents error" id="noteNotActive">
          <span data-l10n-id="not-active">Not active</span><br><br>
          <button type="button" class="text" data-l10n-id="cancel"
            onclick="EditorUI.clearNoteAndReset()">Cancel</button>
          <button type="button" class="text" data-l10n-id="resend"
            onclick="EditorUI.send()">Resend</button>
        </div>
        <div class="overlay-contents error" id="noteNoAnimation">
          <span data-l10n-id="no-animation">No animation</span><br><br>
          <button type="button" class="text"
            onclick="EditorUI.returnToAnimation()" data-l10n-id="ok">OK</button>
        </div>
        <div class="overlay-contents" id="noteConfirmDelete">
          <span data-l10n-id="confirm-delete-frame">Delete this
            frame?</span><br><br>
          <button type="button" class="text" data-l10n-id="delete"
            id="confirmDeleteButton">Delete</button>
          <button type="button" class="text" data-l10n-id="cancel"
            onclick="EditorUI.clearNote()">Cancel</button>
        </div>
        <!-- In future we should be able to remove this -->
        <div class="overlay-contents" id="noteNoWall" data-l10n-id="no-wall">
          No wall
        </div>
      </div>
    </div>
  </body>
</html>
