<?php
/* vim: set syn=php: */

require_once(dirname(__FILE__) . "/../../../wall/lib/parapara.inc");
require_once('designs.inc');

function getWall() {
  $uri = $_SERVER['REQUEST_URI'];
  if (strlen($uri) < 2)
    return null;
  return substr($uri, 1); // Skip initial /
}

function getStylesheet() {
  global $config;

  // Get wall name
  $wall = getWall();
  if (!$wall)
    return;

  // Get design name
  $design = null;
  try {
    $design = DesignGallery::getByWallPath($wall);
  } catch (KeyedException $e) {
    error_log(print_r($e, true));
  }
  if (!$design || $design->editorStylesheet === null)
    return null;

  // Construct URL to stylesheet
  // XXX Rename upload_server to wall_server
  $server_path = $config['editor']['upload_server'];
  // Make sure server path ends with a /
  if (substr($server_path, -1) !== "/")
    $server_path .= "/";
  return $server_path . $design->editorStylesheet;
}
?>
