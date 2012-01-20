<?php
require_once("CONSTANTS.inc");
require_once("db.inc");

$connection = getConnection();

function resize($source, $sWidth, $sHeight, $rWidth, $rHeight) {
	$resized = imagecreatetruecolor($rWidth, $rHeight);
	imagealphablending($resized, false);
	imageSaveAlpha($resized, true);
	$fillcolor = imagecolorallocatealpha($resized, 0, 0, 0, 127);
	imagefill($resized, 0, 0, $fillcolor);
	imagecopyresampled(
		$resized,
		$source,
		0, 0,
		0, 0,
		$rWidth, $rHeight,
		$sWidth, $sHeight
	);
	return $resized;
}

try {
	$uploaddir = CHARACTERS_DIR;
	$file = basename($_FILES['userfile']['name']);
	$uploadfile = $uploaddir . $file;
	
	if (! move_uploaded_file($_FILES['userfile']['tmp_name'], $uploadfile)) {
		throw new Exception("Faild to upload");
	}

	//get trimming size
    $image = imagecreatefrompng($uploadfile);
    $wOfImage = imagesx($image);
    $hOfImage = imagesy($image);
	$resized = resize($image, $wOfImage, $hOfImage, 296, 345);
    imagedestroy($image);
	$image = $resized;
    $wOfImage = imagesx($image);
    $hOfImage = imagesy($image);
    // Start scanning for the edges.
    $minx = $wOfImage;
    $maxx = 0;
    $miny = $hOfImage;
    $maxy = 0;
    for ($iy=0; $iy<$hOfImage; $iy++){
    	$hasOpaque = false;
        for ($ix=0; $ix<$minx; $ix++){
            $rgba = imagecolorat($image, $ix, $iy);
			$alpha = ($rgba & 0x7F000000) >> 24;
			if ($alpha != 127) {
				$minx = $ix;
				$hasOpaque = true;
				break;
			}
        }
        for ($ix=$wOfImage-1; $ix>$maxx; $ix--){
            $rgba = imagecolorat($image, $ix, $iy);
			$alpha = ($rgba & 0xFF000000) >> 24;
			if ($alpha != 127) {
				$maxx = $ix;
				$hasOpaque = true;
				break;
			}
        }
        if ($hOfImage == $miny && true == $hasOpaque) {
	        $miny = $iy;
        }
    }
    //find end y
    for ($iy=$hOfImage-1; $iy>=0; $iy--){
        for ($ix=0; $ix<$wOfImage; $ix++){
            $rgba = imagecolorat($image, $ix, $iy);
			$alpha = ($rgba & 0xFF000000) >> 24;
			if ($alpha != 127) {
				$maxy = $iy;
				$iy = -1;
				break;
			}
        }
    }
    
    preg_match_all("/\d+/", $uploadfile, $out, PREG_PATTERN_ORDER);
    $id = $out[0][0];
    $number = $out[0][1];
    $width = $maxx - $minx;
    $height = $maxy - $miny;

	//trimming
    $trimmed = imagecreatetruecolor($width, $height);	
    imagesavealpha($trimmed, true);
	$transparentColor = imagecolorallocatealpha($image,0x00,0x00,0x00,127);
	imagefill($trimmed, 0, 0, $transparentColor); 
	imagecopy($trimmed, $image, 0, 0, $minx, $miny, $width, $height);
	imagepng($trimmed, $uploaddir."s".$file);
    imagedestroy($trimmed);
    imagedestroy($image);

	$query = "INSERT INTO images(character_id,number,x,y,width,height) VALUES($id,$number,$minx,$miny,$width,$height)";
	mysql_query($query, $connection) or throwException(mysql_error());
	
    print $minx."-".$maxx." ".$miny."-".$maxy;
} catch (Exception $e) {
	$message = $e->getMessage();
	print "error=$message";
}

mysql_close($connection);

?>