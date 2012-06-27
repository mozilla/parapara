<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("../../../../wall/lib/parapara.inc");
require_once("db.inc");
require_once("UriUtils.inc");

header("Content-Type: text/plain; charset=UTF-8");

// Check if event is over
if (!$config['characters']['accept_new']) {
  print "{\"error_key\":\"not_live\"}\n\n";
  exit;
}

// Read JSON request
$handle = fopen('php://input','r');
$jsonString = fgets($handle);
$json = json_decode($jsonString,true);
fclose($handle);

// Parse request
$title = $json["title"];
$author = $json["author"];
$y = $json["y"];
$svg = $json["svg"];
$id = @$json["id"];

$connection = getConnection();

try {
  $rtime = ceil(microtime(TRUE)*1000);

  // Add or update the entry in the characters table
  if ($id) {
    $query4update =
      "UPDATE characters SET title='$title',author='$author',y=$y," .
      "rtime=$rtime,x=NULL WHERE id=$id";
    mysql_query($query4update, $connection) or throwException(mysql_error());
  } else {
    $query4insert =
      "INSERT INTO characters(title,author,y,rtime) VALUES('$title'," .
      "'$author',$y,$rtime)";
    mysql_query($query4insert, $connection) or throwException(mysql_error());
  }

  // Get the id
  if (!$id) {
    $id = mysql_insert_id();
  }

  // Save file
  // XXXbb We should use a DB transaction for the above and roll it back if 
  // saving the file fails
  // (First, switch to PDO?)
  $svgfilename = getFilenameForId($id);
  $svgfile = @fopen($svgfilename, 'w');
  if ($svgfile == false) {
    print '{"error_key":"failed_to_write",'
      . '"error_detail":"このファイルには書き込みできません"}' . "\n\n";
  } else {
    fwrite($svgfile, $svg);
    fclose($svgfile);
    $url = shortenUrl(getGalleryUrlForId($id));
    print "{\"id\":$id,\"url\":\"$url\"}\n\n";
  }
} catch (Exception $e) {
  $message = $e->getMessage();
  print "{\"error_key\":\"db_error\",\"error_detail\":\"$message\"}\n\n";
}
mysql_close($connection);
?>
