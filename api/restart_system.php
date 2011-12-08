<?php
header("Content-Type: text/plain; charset=UTF-8");

require_once("CONSTANTS.inc");
require_once("db.inc");
$connection = getConnection();
try {
	$rtime = time();
	$query4system = "UPDATE system last_started=$rtime";
	mysql_query($query4system, $connection) or throwException(mysql_error());
} catch (Exception $e) {
	$message = $e->getMessage();
	print "error=$message";
}
mysql_close($connection);
?>
