<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

class EditorPage {

  public static $session;

  // locators


  public function __construct($browser_session){
	  self::$session = $browser_session;
  }

  public function go_to_editor(){

    self::$session->open("http://parapara-editor.mozlabs.jp/test");

    // Wait for stuff to load
    sleep(3);
  }

  public function centre_mouse_on_canvas(){

    // TODO this doesn't work as well as it should

    // get the main drawing area
  	$workspace = self::$session->element('css selector', 'div.canvas-background');

    // get the size of it and calculate the centrepoint
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
    self::switch_to_picker_frame();

    $eraser = self::$session->element("css selector", "#medium .eraser");
    $eraser->click();

    // switch back now to the parent so test can continue
    self::switch_to_main_frame();
  }

  public function select_width($size){
    // accepts strings "big", "middle", "small" matching the IDs of the <rect> elements
    self::switch_to_widths_frame();
    $width_element = self::$session->element("id", $size);
    $width_element->click();

    // switch back now to the parent so test can continue
    self::switch_to_main_frame();
  }

  public function click_add_a_new_frame(){

    // Get the element of the plus frame
    $plus_frame = self::$session->element("id", "plus-frame");
    // now click it
    $plus_frame->click();
    sleep(2);
  }

  public function delete_frame_by_index($index){
    $frames = self::$session->elements('css selector', '#close-selection-region');
    $frames[$index]->click();

    // Switch back to main frame and do confirm delete button
    self::switch_to_main_frame();
    $conf_delete = self::$session->element('id', 'confirmDeleteButton');
    $conf_delete->click();
  }

  public function click_language_settings_menu(){
    $settings_menu = self::$session->element('css selector','nav.settingsMenu');
    $settings_menu->click();
    sleep(1);
  }

  public function click_language($lang){
    $lang_option = self::$session->element('css selector', "li[lang='".$lang."']");
    $lang_option->click();
    // Wait for refresh
    sleep(2);
  }

  public function switch_to_main_frame(){
    self::$session->frame();
  }

  public function switch_to_picker_frame(){
    self::switch_to_main_frame();
    // Get picker iframe element
    $picker_frame = self::$session->element("id", "picker");

    // Switch into the picker's iframe
    self::$session->switch_to_frame($picker_frame);
  }

  public function switch_to_filmstrip_frame(){
    self::switch_to_main_frame();
    // Get filmstrip iframe element
    $fs_frame = self::$session->element("id", "filmstrip");
    self::$session->switch_to_frame($fs_frame);
  }

  public function switch_to_widths_frame(){

    self::switch_to_main_frame();
    // Get widths iframe element
    $widths_frame = self::$session->element("id", "widths");

    self::$session->switch_to_frame($widths_frame);
  }

}
