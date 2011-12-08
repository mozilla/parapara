<?php
header("Content-Type: text/plain; charset=UTF-8");

//$HTTP_QUERY = $_GET;
$HTTP_QUERY = $_POST;
$title = $HTTP_QUERY["title"];
$author = $HTTP_QUERY["author"];
$speed = $HTTP_QUERY["speed"];
$total = $HTTP_QUERY["total"];
$appearance_y = $HTTP_QUERY["pos_y"];
$id = $HTTP_QUERY["id"];
/*
print "TITLE:$title\n";
print "AUTHOR:$author\n";
print "SPEED:$speed\n";
print "POST_Y:$appearance_y\n";
*/
require_once("CONSTANTS.inc");
require_once("db.inc");
$connection = getConnection();

try {
	$rtime = ceil(microtime(TRUE)*1000);

	/*
	$query4system = "SELECT last_started FROM system";
	$resultset4system = mysql_query($query4system, $connection) or throwException(mysql_error());
	$row4system = mysql_fetch_array($resultset4system);
	$appearance_time = $rtime - ($row4system["last_started"]);
	mysql_free_result($resultset4system);
	$query4insert = "INSERT INTO characters(title,author,speed,total,appearance_time,rtime) VALUES('$title','$author',$speed,$total,$appearance_time,$rtime)";
	mysql_query($query4insert, $connection) or throwException(mysql_error());
	*/
	
	if ($id) {
		$query4update = "UPDATE characters SET title='$title',author='$author',speed=$speed,total=$total,appearance_y=$appearance_y,rtime=$rtime,appearance_x=NULL WHERE id=$id";
		mysql_query($query4update, $connection) or throwException(mysql_error());
	} else {
		$query4insert = "INSERT INTO characters(title,author,speed,total,appearance_y,rtime) VALUES('$title','$author',$speed,$total,$appearance_y,$rtime)";
		mysql_query($query4insert, $connection) or throwException(mysql_error());
	}

	$query4select = "SELECT id FROM characters WHERE rtime=$rtime";
	$resultset = mysql_query($query4select, $connection) or throwException(mysql_error());
	if ($row = mysql_fetch_array($resultset)) {
		$id = $row["id"];
		print $id;
	}
	mysql_free_result($resultset);
} catch (Exception $e) {
	$message = $e->getMessage();
	print "error=$message";
}
mysql_close($connection);
?>
