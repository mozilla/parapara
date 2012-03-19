<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/CONSTANTS.inc");
require_once("../../lib/db.inc");
$connection = getConnection();

if (isset($_REQUEST['action']) && $_REQUEST['action'] == 'update') {
  // Update record
  $query = "UPDATE characters SET active = "
    . (isset($_REQUEST['makeActive']) ? "1" : "0")
    . " WHERE id = " . $_REQUEST['id'];
  mysql_query($query, $connection) or throwException(mysql_error());

  // Get next id
  $active_cond = isset($_REQUEST['active']) ? "AND active = 1" : "";
  $query = "SELECT id FROM characters WHERE id > " . $_REQUEST['id']
         . " $active_cond ORDER BY id limit 1";
  $result = mysql_query($query);
  $next_id = null;
  if (mysql_num_rows($result)) {
    $next_id = mysql_result($result, 0);
  } else {
    error("おわり！", "おわりました！");
  }

  $url = $_SERVER['PHP_SELF'] . "?id=$next_id";
  header("Location: $url\r\n\r\n");
  exit;
}

function error($title, $message) {
  echo "<html><head>$title</head><body><h1>$message</h1></body></html>\n";
  exit;
}
?>
<!DOCTYPE html>
<html>
  <head>
    <title>Filter</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style type="text/css">
    button {
      font-size: 1.5em;
      margin: 1em;
    }
    button.active {
      color: green;
    }
    button.inactive {
      color: red;
    }
    button.current {
      font-weight: bold;
      text-decoration: underline;
    }
    </style>
  </head>
<body>
<?php
// Get id
$id = $_REQUEST['id'];
if (!$id) {
  $id = mysql_result(mysql_query("SELECT min(id) FROM characters"), 0);
}

// Filename
$filename = $id . ".svg";

// Metadata
$query = "SELECT author, title, active FROM characters WHERE id = $id";
$result = mysql_query($query);
$found = false;
if ($result && mysql_num_rows($result) == 1) {
	$row = mysql_fetch_array($result);
  $author = $row["author"];
  $title  = $row["title"];
  $active = $row["active"];
  $found  = true;
}

if (!$found) {
  error("Not found", "Not found");
}
?>
<center>
<table>
<tr><th>タイトル：</th><td><?php echo $title ?></td></tr>
<tr><th>名前：</th><td><?php echo $author ?></td></tr>
</table>
<img src="<?php echo $filename ?>" height="500"/><br/>
<form action="<?php echo $_SERVER['PHP_SELF'] ?>" method="post">
<label><input type="checkbox" name="active"/>アクティブファールのみ処理</label><br/>
<input type="hidden" name="id" value="<?php echo $id ?>"/>
<input type="hidden" name="action" value="update"/>
<button name="makeInactive" class="inactive<?php echo
  $active ? "" : " current"?>" accesskey="1">インアクティブ</input>
<button name="makeActive" class="active<?php echo
  $active ? " current" : "" ?>" accesskey="2">アクティブ</input>
</form>
</center>
</body>
</html>
