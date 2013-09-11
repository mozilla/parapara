<!doctype html>
<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this file,
   - You can obtain one at http://mozilla.org/MPL/2.0/.  -->
<?php
  // We have to make everything absolute so that when the access resources from 
  // subdirectories mapped to this file we can still find all the resources
  $wallRoot = dirname($_SERVER['SCRIPT_NAME']);
?>
<html>
  <head>
    <meta charset="utf-8">
    <title>Parapara Animation loading...</title>
    <script>
      var Parapara = Parapara || {};
      Parapara.wallName = '<?php echo @$_REQUEST['wall'] ?>';
      Parapara.view = '<?php echo @$_REQUEST['view'] ?>';
    </script>
    <script data-main="<?php echo $wallRoot ?>/js/main.js"
      src="/js/lib/require.js"></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body, html {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: 0;
      }
      div.error {
        display: none;
        position: fixed;
        
        left: 50%;
        width: 400px;
        max-width: 80%;
        margin-left: -200px;
        text-align: center;
        
        top: 50%;
        margin-top: -75px;
        vertical-align: center;
        
        background: rgb(242, 222, 222);
        border: 1px solid rgb(185, 74, 72);
        color: rgb(185, 74, 72);
        border-radius: 15px;
        padding: 35px 14px;
        margin-bottom: 1em 10%;
      }
      @media (max-width: 400px) {
        div.error {
          left: inherit;
          width: 96%;
          margin-left: 2%;
          margin-right: 2%;
        }
      }
    </style>
  </head>
  <body>
    <iframe id="wallFrame"></iframe>
    <div class="error"></div>
    <script>
      var wallStream = new EventSource("/api/walls/byname/<?php echo $_REQUEST['wall'] ?>/live");
      wallStream.onopen = function(e) {
        console.log("Stream opened");
      };
      wallStream.onerror = function(e) {
        console.log("Stream closed");
      };
      wallStream.addEventListener("start-session", genericEventHandler);
      wallStream.addEventListener("add-character", genericEventHandler);
      wallStream.addEventListener("remove-character", genericEventHandler);
      wallStream.addEventListener("change-design", genericEventHandler);
      wallStream.addEventListener("change-duration", genericEventHandler);
      wallStream.addEventListener("remove-wall", genericEventHandler);

      function genericEventHandler(e) {
        console.log(e.type);
        console.log(e);
      }
    </script>
  </body>
</html>
