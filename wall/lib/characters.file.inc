<?php
/* vim: set syn=php: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");
require_once("exceptions.inc");

class CharacterFile {
  private static $WHITE_TAGS = ['svg', 'g', 'path', 'set', 'circle', 'polygon'];
  private static $WHITE_ATTRIBUTES = [
    'xmlns', 'width', 'height', 'viewBox', 'data-ground-offset', 'visibility',
    'stroke', 'stroke-width', 'stroke-linecap', 'fill', 'pointer-events', 'd',
    'attributeName', 'to', 'dur', 'id', 'begin', 'cx', 'cy'
  ];
  // Given an animated character SVG file, strips animation elements and all but
  // the first frame.
  public static function getStaticCharacter($svg) {
    // Parse file
    libxml_disable_entity_loader(true);
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

    CharacterFile::extractWhiteTagAndAttribute($doc);

    // Serialize
    return $doc->saveXML($doc->documentElement, LIBXML_NOXMLDECL);
  }

  private static function extractWhiteTagAndAttribute($element) {
    if ($element->nodeType !== XML_DOCUMENT_NODE && !in_array($element->nodeName, (array)CharacterFile::$WHITE_TAGS)) {
      $element->parentNode->removeChild($element);
      return;
    }
    for ($i = $element->attributes->length; $i--;) {
      $attribute = $element->attributes[$i];
      if (!in_array($attribute->name, CharacterFile::$WHITE_ATTRIBUTES)) {
        $element->removeAttribute($attribute->name);
      }
    }
    if ($element->hasChildNodes()) {
      for ($i = $element->childNodes->length; $i--;) {
        CharacterFile::extractWhiteTagAndAttribute($element->childNodes->item($i));
      }
    }
  }
}

?>
