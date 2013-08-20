<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/../ParaparaTestCase.php');
require_once('characters.file.inc');

class TestCharacterFile extends ParaparaTestCase {
  protected $testFolder = "characters";

  function testStaticFile() {
    foreach (glob($this->testFolder . '/*.in.svg') as $filename) {
      // Check for a static reference file
      $refFile = str_replace('.in.svg', '.static.svg', $filename);
      if (!file_exists($refFile))
        continue;

      // Run staticalizer
      $in = file_get_contents($filename);
      $ref = file_get_contents($refFile);
      $out = CharacterFile::getStaticCharacter($in);

      // Compare
      $this->assertEqual($out, trim($ref), "%s (File: $filename)");
    }
  }
}

?>
