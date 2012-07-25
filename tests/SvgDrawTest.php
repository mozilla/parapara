<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('TestBase.php');
require_once('EditorPage.php');

class SvgDrawTest extends TestBase {

  public function test_draw_a_path() {

    $editor_page = new EditorPage(self::$session);
    $editor_page->go_to_editor();

    $editor_page->centre_mouse_on_canvas();

    $editor_page->draw_a_path(50, 50);

    $path = self::$session->element('css selector', 'g#parapara g.frame path');
    $this->assertTrue($path->displayed());
  }

  public function test_draw_a_circle() {

    $editor_page = new EditorPage(self::$session);
    $editor_page->go_to_editor();

    $editor_page->centre_mouse_on_canvas();

    $editor_page->draw_a_circle();

    $circle = self::$session->element('css selector', 'g#parapara g.frame circle');
    $expected_r = '4';

    $this->assertTrue($circle->displayed());
    $this->assertEquals($circle->attribute('r'), $expected_r);
  }

  public function test_delete_path() {

    $editor_page = new EditorPage(self::$session);
    $editor_page->go_to_editor();

    $editor_page->centre_mouse_on_canvas();

    $editor_page->draw_a_path(50, 50);

    // check the path is present before we proceed
    $this->assertTrue(self::$session
      ->element('css selector', 'g.frame path')->displayed());

    $editor_page->select_delete_tool();

    $editor_page->centre_mouse_on_canvas();

    $editor_page->draw_a_path(50, 50);
    
    // check that there are 0 paths or circles on the canvas
    $this->assertEquals(0, 
      count(self::$session->elements('css selector', 'g.frame *')));
  }

  public function test_delete_circle() {

    $editor_page = new EditorPage(self::$session);
    $editor_page->go_to_editor();

    $editor_page->centre_mouse_on_canvas();

    $editor_page->draw_a_circle();

    // check the circle is present before we proceed
    $this->assertTrue(self::$session->element('css selector', 'g.frame circle')->displayed());

    $editor_page->select_delete_tool();

    $editor_page->centre_mouse_on_canvas();

    $editor_page->draw_a_circle();

    // check that there are 0 paths or circles on the canvas
    $this->assertEquals(0, 
      count(self::$session->elements('css selector', 'g.frame *')));
  }
}
