<?
require_once("../api/CONSTANTS.inc");
require_once("../api/db.inc");
$connection = getConnection();
?>
<!DOCTYPE html>
<html>
  <head>
    <title>キャラクター</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  </head>
<body>
<table cellpadding="5" style="font-size: 1.2em">
<tr><th>&nbsp;</td><th>名前</th><th>タイトル</th><th>URL</th></tr>
<?php
  $base_url = "http://parapara.mozlabs.jp/characters/";
  $query = "SELECT id, author, title, active FROM characters";
  $result = mysql_query($query, $connection) or throwException(mysql_error());
  while ($row = mysql_fetch_array($result, MYSQL_NUM)) {
    $url = $base_url . $row[0] . ".svg";
    echo "<tr>";
    echo "<td>" . ($row[0] ? "&#x25cb;" : "&nbsp;") . "</td>";
    echo "<td>" . $row[1] . "</td>";
    echo "<td>" . $row[2] . "</td>";
    echo "<td><a href=\"$url\">$url</a></td>";
    echo "</tr>\n";
  }
?>
</table>
</body>
</html>
