<?php
header("Content-Type: text/plain; charset=UTF-8");

$handle = fopen('php://input','r');
$jsonString = fgets($handle);
$json = json_decode($jsonString,true);
fclose($handle);
          
$title = $json["title"];
$author = $json["author"];
$y = $json["y"];
$svg = $json["svg"];

require_once("CONSTANTS.inc");
require_once("db.inc");
$connection = getConnection();

try {
	$rtime = ceil(microtime(TRUE)*1000);

	if ($id) {
		$query4update = "UPDATE characters SET title='$title',author='$author',y=$y,rtime=$rtime,x=NULL WHERE id=$id";
		mysql_query($query4update, $connection) or throwException(mysql_error());
	} else {
		$query4insert = "INSERT INTO characters(title,author,y,rtime) VALUES('$title','$author',$y,$rtime)";
		mysql_query($query4insert, $connection) or throwException(mysql_error());
	}

	$query4select = "SELECT id FROM characters WHERE rtime=$rtime";
	$resultset = mysql_query($query4select, $connection) or throwException(mysql_error());
	if ($row = mysql_fetch_array($resultset)) {
		$id = $row["id"];
	}
	mysql_free_result($resultset);

	$svgfilename = "../characters/".$id.".svg";

	$svgfile = @fopen($svgfilename, 'w');
	if ($svgfile == false) {
		print "このファイルには書き込みできません。<br>\n";
	} else {
		fwrite($svgfile, $svg);
		fclose($svgfile);
		print $id;
	}
} catch (Exception $e) {
	$message = $e->getMessage();
	print "error=$message";
}
mysql_close($connection);
?>
