<?php
header("Content-Type: text/plain; charset=UTF-8");

require_once("CONSTANTS.inc");
require_once("db.inc");
$connection = getConnection();

//$type = intval($_GET["type"]);

$list = array();
try {
	//update restart time
	/*
	if ($type == 1) {
		$rtime = ceil(microtime(TRUE)*1000);
		$query4system = "UPDATE system SET last_started=$rtime";
		mysql_query($query4system, $connection) or throwException(mysql_error());
	}
	*/

	$query = "SELECT id,total,speed,appearance_x,appearance_y FROM characters ORDER BY appearance_x";
	$resultset = mysql_query($query, $connection) or throwException(mysql_error());

	while ($row = mysql_fetch_array($resultset)) {
		$character = array();
		$characterid = intval($row["id"]);
		$character["id"] = $characterid;
		$character["total"] = intval($row["total"]);
		$character["speed"] = intval($row["speed"]);
		$character["appearance_x"] = intval($row["appearance_x"]);
		$character["appearance_y"] = intval($row["appearance_y"]);

		$query4images = "SELECT number,x,y,width,height FROM images WHERE character_id=$characterid ORDER BY number";
		$resultset4images = mysql_query($query4images, $connection) or throwException(mysql_error());
		$images = array();
		while ($row4images = mysql_fetch_array($resultset4images)) {
			$image = array();
			$image["number"] = intval($row4images["number"]);
			$image["x"] = intval($row4images["x"]);
			$image["y"] = intval($row4images["y"]);
			$image["width"] = intval($row4images["width"]);
			$image["height"] = intval($row4images["height"]);
			array_push($images, $image);
		}
		$character["images"] = $images;

		array_push($list, $character);
	}
	
	mysql_free_result($resultset);
} catch (Exception $e) {
	$list["error"] = $e->getMessage();
}
mysql_close($connection);

echo json_encode($list);
?>