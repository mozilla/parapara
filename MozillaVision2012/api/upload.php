<?php
require_once("CONSTANTS.inc");

$HTTP_QUERY = $_POST;
$id = $HTTP_QUERY["id"];
$number = $HTTP_QUERY["number"];
$imagecontents = $HTTP_QUERY["image"];

try {
	$filename = CHARACTERS_DIR.$id."_".$number.".png";
	$filepointer = fopen($filename, "w");
	if (!$filepointer) {
		throw new Exception("Faild to open file $filename");
	}
	if (!fwrite($filepointer, $imagecontents)) {
		throw new Exception("Faild to write file $filename");
	}
	fclose($filepointer);
} catch (Exception $e) {
	$message = $e->getMessage();
	print "error=$message";
}
print "id:$id number:$number\n";
print "$imagecontents";
?>