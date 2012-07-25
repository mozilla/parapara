<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('TestBase.php');
require_once('EditorPage.php');

class ViewportSizeTest extends TestBase {

  // these tests check the responsiveness of the page to the window size

  protected static $portrait_size = array('width' => 360, 'height' => 640);
  protected static $landscape_size = array('width' => 640, 'height' => 360);

  public function test_resize_to_tablet_portrait(){

    $editor_page = new EditorPage(self::$session);
    $editor_page::$session->window()->postSize(self::$portrait_size);

    $editor_page->go_to_editor();

    $filmstrip_location = $editor_page::$session
      ->element("id", "filmstrip")->location();
    $toolbox_location = $editor_page::$session
      ->element("css selector", "div.tool-box")->location();
    $window_size = $editor_page::$session->window()->size();

    // check that at this size the filmstrip is located at (0,0)
    $this->assertEquals(0, $filmstrip_location['x']);
    $this->assertEquals(0, $filmstrip_location['y']);

    // check that the toolbox is located in the bottom half of the window
    $this->assertEquals(0, $toolbox_location['x']);
    $this->assertGreaterThan((int)($window_size['height']/2),
      $toolbox_location['y']);
  }

  public function test_resize_to_tablet_landscape(){

    $editor_page = new EditorPage(self::$session);
    $editor_page::$session->window()->postSize(self::$landscape_size);

    $editor_page->go_to_editor();

    $filmstrip_location = $editor_page::$session
      ->element("id", "filmstrip")->location();
    $toolbox = $editor_page::$session->element("css selector", "div.tool-box");
    $toolbox_location = $toolbox->location();
    $toolbox_size = $toolbox->size();

    // check that at this size the filmstrip is located at the top
    $this->assertEquals($toolbox_size['width'], $filmstrip_location['x']);
    $this->assertEquals(0, $filmstrip_location['y']);

    // check that the toolbox is located at (0,0)
    $this->assertEquals(0, $toolbox_location['x']);
    $this->assertEquals(0, $toolbox_location['y']);
  }
}
