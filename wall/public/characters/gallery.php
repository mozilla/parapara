<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 */
date_default_timezone_set('Asia/Tokyo');
$id = intval($_GET["id"]);
require_once("../../lib/parapara.inc");
require_once("db.inc");
$connection = getConnection();
try {
	$query = "SELECT title,author,rtime FROM characters WHERE id=$id";
	$result = mysql_query($query, $connection) or throwException(mysql_error());
	if ($row = mysql_fetch_array($result)) {
		$author = $row["author"];
		$title = $row["title"];
		$rtime = $row["rtime"];
		$createdtime = date('Y-m-d H:i:s', intval($rtime)/1000);
	} else {
		$error = $e->getMessage();
	}
	mysql_free_result($result);
} catch (Exception $e) {
	$error = $e->getMessage();
}
mysql_close($connection);
?>
<!DOCTYPE html>
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
		text-align: center;
	}
	#description {
		margin-top: 3px;
		text-align: center;
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
	#character {
		background-color: black;
		border-radius: 20px;
		-moz-border-radius: 20px;
		-webkit-border-radius: 20px;
		-o-border-radius: 20px;
		-ms-border-radius: 20px;
	}
	#message {
		font-size: 10px;
		margin-top: 10px;
	}
	#feedbacks {
		margin-top: 10px;
		text-align: center;
	}
	</style>
</head>
<body>
	<div id="content">
		<div id="title"><?php print $title; ?> - <?php print $author; ?>さん作</div>
		<center>
		<object id="character" width="400" data="<?php print $id; ?>.svg">
		</object>
		</center>
		<div id="description">
			<div id="date"><?php print $createdtime; ?></div>
			<div id="place">Mozilla ワークショップ in 福島</div>
		</div>

		<div id="feedbacks">
			<div class="fb-like" data-href="http://parapara.mozlabs.jp/Fukushima100/characters/<?php print $id; ?>" data-send="false" data-layout="button_count" data-width="100" data-show-faces="false"></div>		
			<a href="https://twitter.com/share" class="twitter-share-button">Tweet</a>
		</div>		

		<div id="message">
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
