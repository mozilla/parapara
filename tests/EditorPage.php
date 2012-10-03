<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

class EditorPage {

  public static $session;

  public function __construct($browser_session){
	  self::$session = $browser_session;
  }

  public function go_to_editor(){

    self::$session->open("http://parapara-editor.mozlabs.jp/test");
    //$this->assertEquals(self::$session->title(), "パラパラアニメーション");
  }

  public function centre_mouse_on_canvas(){

    // TODO this doesn't work as well as it should
  	$workspace = self::$session->element('tag name', 'rect');
    $workspace_size = $workspace->size();
	  $centre['x'] = (int)($workspace_size['width'] * 0.5);
	  $centre['y'] = (int)($workspace_size['height'] * 0.5);

    // move to a space within the canvas
    self::$session->moveto(array('element' => $workspace->getID(), 
      'xoffset' => $centre['x'], 'yoffset' => $centre['y']));
  }

  public function draw_a_path($x_offset, $y_offset){

    self::$session->buttondown("");
    self::$session->moveto(array('xoffset' => $x_offset, 
      'yoffset' => $y_offset));
    self::$session->buttonup("");
  }

  public function draw_a_circle(){

    self::$session->click();
    // wait for poly to turn into a circle
    sleep(1);
  }

  public function select_delete_tool(){

    // Get picker and its size, calculate the position of the eraser
    $picker = self::$session->element("id", "picker");
    $picker_size = $picker->size();

    $eraser['x'] = (int)($picker_size['width'] * 0.33);
    $eraser['y'] = (int)($picker_size['height'] * 0.8);

    self::$session->moveto(array('element' => $picker->getID(), 
      'xoffset' => $eraser['x'], 'yoffset' => $eraser['y']));
    self::$session->click();
  }

}
