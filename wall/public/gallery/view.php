<!DOCTYPE html>
<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this file,
   - You can obtain one at http://mozilla.org/MPL/2.0/.  -->
<html lang="ja" xmlns="http://www.w3.org/1999/xhtml">

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
		width: 600px;
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
	#place {
		display: inline-block;
	}
	#parapara {
		width: 600px;
		height: 380px;
		border-radius: 10px;
		-moz-border-radius: 10px;
		-webkit-border-radius: 10px;
		-o-border-radius: 10px;
		-ms-border-radius: 10px;
	}
	.fb-like {
		position: relative;
		top: -4px;
	}
	#message {
		font-size: 10px;
		margin-top: 10px;
	}
	</style>
</head>
<body>
	<div id="content">
		<div id="title">Fukushima 100</div>
		<object id="parapara" data="wall-gallery/">
		</object>
		<div id="description">
			<div id="date">2012/03/25</div>
			<div id="place">福島県郡山駅前 モレティ</div>
		</div>

		<div id="feedbacks">
			<div class="fb-like" data-href="http://parapara.mozlabs.jp/Fukushima100/" data-send="false" data-layout="button_count" data-width="100" data-show-faces="false"></div>		
			<a href="https://twitter.com/share" class="twitter-share-button">Tweet</a>
		</div>		

		<div id="message">
本アプリケーションは、ウェブ標準技術である <a href="https://developer.mozilla.org/ja/SVG">SVG</a> の最新技術を利用して構成されています。<br/>
対応しているウェブブラウザにてご覧ください。
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
