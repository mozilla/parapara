<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

require_once("../../lib/parapara.inc");
require_once('characters.file.inc');
require_once('characters.inc');

header('Content-Type: image/svg+xml; charset=UTF-8');

// Check for a valid ID
$id = intval($_REQUEST['id']);
if ($id < 1 || !@file_exists($id . '.svg')) {
  echo file_get_contents("sad-face.svg");
  exit;
}

// Get static SVG contents
$animated = file_get_contents($id . '.svg');
$static = CharacterFile::getStaticCharacter($animated);
if (!$static) {
  echo file_get_contents("sad-face.svg");
  exit;
}

// Save file
$out = Character::getPreviewFile($id);
if (!file_exists($out) && is_writeable(dirname($out))) {
  file_put_contents($out, $static);
}

// Output
echo $static;

?>
