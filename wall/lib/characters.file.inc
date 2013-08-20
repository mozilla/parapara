<?php
/* vim: set syn=php: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");
require_once("exceptions.inc");

class CharacterFile {
  // Given an animated character SVG file, strips animation elements and all but
  // the first frame.
  public static function getStaticCharacter($svg) {
    // Parse file
    $doc = new DOMDocument();
    if ($doc->loadXML($svg) === FALSE)
      throw new KeyedException('bad-file', 'Invalid SVG');

    // Set up XPath
    $xpath = new DOMXPath($doc);
    $xpath->registerNamespace('svg', 'http://www.w3.org/2000/svg');

    // Strip all but first frame
    $extraFrames = $xpath->query('/svg:svg/svg:g[position()>1]');
    foreach ($extraFrames as $frame) {
      $frame->parentNode->removeChild($frame);
    }

    // Prepare first frame
    $frames = $xpath->query('/svg:svg/svg:g');
    if ($frames->length) {
      $firstFrame = $frames->item(0);

      // Remove animation descendant elements
      $animations = $xpath->query(
        'svg:set | svg:animate | svg:animateTransform | svg:animateMotion',
        $firstFrame);
      foreach ($animations as $animation) {
        $animation->parentNode->removeChild($animation);
      }

      // Strip visibility on first frame
      $firstFrame->removeAttribute("visibility");
    }

    // Serialize
    return $doc->saveXML($doc->documentElement, LIBXML_NOXMLDECL);
  }
}

?>
