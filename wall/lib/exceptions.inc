<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

class KeyedException extends Exception
{
  protected $key = '';

  public function __construct($key, $detail = "")
  {
    $this->key = $key;
      parent::__construct($detail, 0);
  }
   
  public function getKey()
  {
    return $this->key;
  }

  public function getDetail()
  {
    return strlen($this->message) ? $this->getMessage() : NULL;
  }
}

?>
