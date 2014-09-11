<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../lib/php/parapara.inc");
require_once("db.inc");
require_once("UriUtils.inc");
?>
<!DOCTYPE html>
<html>
  <head>
    <title>キャラクター</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  </head>
<body>
<table cellpadding="5" style="font-size: 1.2em">
<tr><th>名前</th><th>タイトル</th><th>URL</th></tr>
<?php
  $base_url = getCurrentServer() . "/characters/";

  $conn =& getDbConnection();
  $res =& $conn->query(
    'SELECT charId, author, title FROM characters ORDER BY charId');
  checkDbResult($res);
  $conn->setFetchMode(MDB2_FETCHMODE_ASSOC);
  while ($row = $res->fetchRow()) {
    $url = $base_url . $row['charid'] . ".svg";
    echo "<tr>";
    echo "<td>" . $row['author'] . "</td>";
    echo "<td>" . $row['title'] . "</td>";
    echo "<td><a href=\"$url\">$url</a></td>";
    echo "</tr>\n";
  }
?>
</table>
</body>
</html>
