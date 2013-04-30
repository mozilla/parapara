<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. 
 */

header('Content-Type: image/svg+xml; charset=UTF-8');

// Check for a valid ID
$id = intval($_REQUEST['id']);
if ($id < 1 || !@file_exists($id . '.svg')) {
  echo file_get_contents("sad-face.svg");
  exit;
}

// Load the SVG
$doc = new DOMDocument();
$doc->load($id . '.svg');

// Get the frames
$xpath = new DOMXPath($doc);
$xpath->registerNamespace('svg', 'http://www.w3.org/2000/svg');
$frames = $xpath->query('/svg:svg/svg:g');
if ($frames === FALSE) {
  echo file_get_contents("sad-face.svg");
  exit;
}

// Process the animation and:
//
// - remove all but the first frame
// - remove visibility attribute from the first frame
// - remove animations from the first frame
$firstFrame = true;
foreach($frames as $frame) {
  if ($firstFrame) {
    $firstFrame = false;

    // Remove visibility setting
    $frame->removeAttribute('visibility');

    // Remove animation
    $animations = $xpath->query('svg:set|svg:animate', $frame);
    if ($animations) {
      foreach($animations as $animation) {
        $animation->parentNode->removeChild($animation);
      }
    }
  } else {
    $frame->parentNode->removeChild($frame);
  }
}

// Export
echo $doc->saveXML();

?>
