<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('../../lib/parapara.inc');
require_once('MDB2.php');
require_once('ParaparaTestCase.php');

// SimpleTest seems to count the abstract WebTestCase as a test case
// See: http://sourceforge.net/tracker/?func=detail&aid=3473481&group_id=76550&atid=547455
SimpleTest::ignore('WebTestCase');

/*
 * Add abstract base class for tests related to the wall-part of the parapara 
 * system. That is, basically anything that is not specifically an editor test.
 *
 * It includes methods for creating / deleting a test design but does NOT 
 * automatically call it.
 */
abstract class WallTestCase extends ParaparaTestCase {

  protected $testDesignId     = null;
  protected $testDesignFolder = null;

  function __construct($name = false) {
    parent::__construct($name);
  }

  protected function createTestDesign($previewFilesToAdd = array()) {
    // Add to DB
    $query =
      'INSERT INTO designs'
      . ' (name, duration)'
      . ' VALUES ("test", 3000)';
    $res =& $this->getConnection()->query($query);
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    // Store ID
    $this->testDesignId =
      $this->getConnection()->lastInsertID('designs', 'designId');
    if (PEAR::isError($this->testDesignId)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }

    // Add path for preview files
    if (!file_exists($this->designsPath . "test")) {
      if (!mkdir($this->designsPath . "test")) {
        die("Couldn't create test folder");
      }
    }
    if (!file_exists($this->designsPath . "test/preview")) {
      if (!mkdir($this->designsPath . "test/preview")) {
        die("Couldn't create preview folder");
      }
    }
    $this->testDesignFolder = $this->designsPath . "test/";

    // Add preview files
    if (is_array($previewFilesToAdd) && count($previewFilesToAdd)) {
      foreach($previewFilesToAdd as $filename) {
        $file = $this->testDesignFolder . 'preview/' . $filename;
        $handle = fopen($file, 'w');
        fclose($handle);
      }
    }
  }

  protected function removeTestDesign() {
    // Remove test row
    $res =&
      $this->getConnection()->query('DELETE FROM designs WHERE name = "test"');
    if (PEAR::isError($res)) {
      die($res->getMessage() . ', ' . $res->getDebugInfo());
    }
    $this->testDesignId = null;

    // Remove files
    $previewFolder = $this->testDesignFolder . 'preview';
    if (file_exists($this->testDesignFolder . 'preview')) {
      foreach (glob($this->testDesignFolder . 'preview/*.*') as $filename) {
        unlink($filename);
      }
      if (!rmdir($this->testDesignFolder . 'preview')) {
        die("Couldn't remove preview folder");
      }
    }
    // Remove test
    if (file_exists($this->testDesignFolder)) {
      if (!rmdir($this->testDesignFolder)) {
        die("Couldn't remove test design folder");
      }
    }
    $this->testDesignFolder = null;
  }
}
