<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once('PHPWebDriver/WebDriver.php');
require_once("config.inc");

class TestBase extends PHPUnit_Framework_TestCase {


    protected static $session;

    // Will run before every test and set up a browser instance
    public function setUp() {
	global $config;
	$host = 'http://%s:%s/wd/hub';
	$host = sprintf($host, $config['webdriver']['host'], $config['webdriver']['port']);

	// Pass in the host if you would like to run over a Selenium Server/Grid
	$driver = new PHPWebDriver_WebDriver($host);

	// Desired capabilities refer to browser version, platform and other settings
	$desired_capabilities = $config['webdriver'];
	self::$session = $driver->session($config['webdriver']['browserName'], $desired_capabilities);
	self::$session->implicitlyWait(5);
    }

    // Will run after every test and close the browser
    public function tearDown() {
        self::$session->close();
    }
}
