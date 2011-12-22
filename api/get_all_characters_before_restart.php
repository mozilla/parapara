<?php
header("Content-Type: text/plain; charset=UTF-8");

require_once("CONSTANTS.inc");
require_once("db.inc");
$connection = getConnection();

$list = array();
try {
	$query = "SELECT id,x,y FROM characters WHERE x IS NOT NULL ORDER BY x";
	$resultset = mysql_query($query, $connection) or throwException(mysql_error());

	while ($row = mysql_fetch_array($resultset)) {
		$character = array();
		$characterid = intval($row["id"]);
		$character["id"] = $characterid;
		$character["x"] = intval($row["x"]);
		$character["y"] = intval($row["y"]);
		array_push($list, $character);
	}
	
	mysql_free_result($resultset);
} catch (Exception $e) {
	$list["error"] = $e->getMessage();
}
mysql_close($connection);

echo json_encode($list);
?>