<?php
/* vim: set syn=php: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");
require_once("exceptions.inc");

class CharacterFile {
  private static $WHITE_TAGS = array(
    'svg', 'g', 'path', 'set', 'circle', 'polygon'
  );
  private static $WHITE_ATTRIBUTES = array(
    'xmlns', 'width', 'height', 'viewBox', 'data-ground-offset', 'visibility',
    'stroke', 'stroke-width', 'stroke-linecap', 'fill', 'pointer-events', 'd',
    'attributeName', 'to', 'dur', 'id', 'begin', 'cx', 'cy'
  );
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

  private static function getBlackNodes($element) {
    $delete_nodes = array();
    $delete_attributes = array();
    if ($element->nodeType !== XML_DOCUMENT_NODE && !in_array($element->nodeName, (array)CharacterFile::$WHITE_TAGS)) {
      array_push($delete_nodes, $element);
    } else {
      if (isset($element->childNodes)) {
        foreach ($element->childNodes as $child) {
          $nodes_and_attributes = CharacterFile::getBlackNodes($child);
          $delete_nodes = array_merge($delete_nodes, $nodes_and_attributes["nodes"]);
          $delete_attributes = array_merge($delete_attributes, $nodes_and_attributes["attributes"]);
        }
      }
      for ($i = 0; $i < $element->attributes->length; $i++) {
        if (!in_array($element->attributes[$i]->name, (array)CharacterFile::$WHITE_ATTRIBUTES)) {
          array_push($delete_attributes, $element->attributes[$i]);
        }
      }
    }
    return array(
      "nodes" => $delete_nodes,
      "attributes" => $delete_attributes
    );
  }

  private static function extractWhiteTagAndAttribute($element) {
    $nodes_and_attributes = CharacterFile::getBlackNodes($element);
    $nodes = $nodes_and_attributes["nodes"];
    foreach ($nodes as $node) {
      $node->parentNode->removeChild($node);
    }
    $attributes = $nodes_and_attributes["attributes"];
    foreach ($attributes as $attr) {
      $attr->parentNode->removeAttribute($attr->name);
    }
  }
}

?>
