<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once(dirname(__FILE__) . '/../../lib/parapara.inc');
require_once(dirname(__FILE__) . '/APITestCase.php');
require_once('simpletest/autorun.php');

class TestWallStream extends APITestCase {
  function __construct($name = false) {
    parent::__construct($name);
  }

  function setUp() {
    parent::setUp();

    // Handle for stream
    $this->stream = null;

    // Create a test wall
    $this->api->login();
    $this->testWall = $this->api->createWall('Test wall', $this->testDesignId);
    $this->api->logout();

    // This is a long-running test but flushing any output should hopefully stop
    // the browser from giving up
    ob_flush();
    flush();
  }

  function tearDown() {
    $this->closeStream();
    parent::tearDown();
  }

  function testNoWall() {
    list($stream, $headers) = $this->openStream($this->testWall['wallId'] + 1);

    // Check for remove-wall event
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "remove-wall");
  }

  function testNoCharacters() {
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);

    // Check headers
    $this->assertIdentical(@intval($headers['http_code']), 200,
                           "Unexpected HTTP response: %s");
    $this->assertIdentical(@$headers['Content-Type'],
                           "text/event-stream; charset=UTF-8");

    // Should get one start-session event
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "start-session");
    $this->assertTrue(intval($lastEventId) > 1);
  }

  function testNoSessions() {
    // Remove session
    $this->api->login();
    $this->api->deleteSession($this->testWall['wallId'],
      $this->testWall['latestSession']['sessionId']);
    $this->api->logout();

    // Get stream
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);

    // Should get one start-session event
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "start-session");
  }

  function testInitialCharacters() {
    // Add some characters
    $charA = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character A'));
    $charB = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character B'));

    // Read stream
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);

    // Should get start-session event + 2 x add-character events
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 3,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "start-session");
    $this->assertIdentical(@$events[1]['event'], "add-character");
    $this->assertIdentical(@$events[2]['event'], "add-character");

    // Check the character data
    $this->assertIdentical(json_decode(@$events[1]['data'], true), $charA);
    $this->assertIdentical(json_decode(@$events[2]['data'], true), $charB);
  }

  function testAddCharacters() {
    // Read stream
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);

    // Should get start-session event
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "start-session");
    $initialEventId = $lastEventId;

    // Add some characters
    $charA = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character A'));
    $charB = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character B'));

    // Read subsequent events
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 2,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "add-character");
    $this->assertIdentical(@$events[1]['event'], "add-character");

    // Check the character data
    $this->assertIdentical(json_decode(@$events[0]['data'], true), $charA);
    $this->assertIdentical(json_decode(@$events[1]['data'], true), $charB);

    // Check the event ID has increased
    $this->assertTrue($lastEventId >= $initialEventId + 2,
                      "Last event ID has not increased by the expected amount");
  }

  function testAddCharactersAfterResume() {
    // Read stream
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);

    // Should get start-session event
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "start-session");
    $initialEventId = $lastEventId;

    // Close stream
    $this->closeStream();

    // Add some characters
    $charA = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character A'));
    $charB = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character B'));

    // Re-open stream
    list($stream, $headers) =
      $this->openStream($this->testWall['wallId'], $lastEventId);

    // Read subsequent events
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 2,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "add-character");
    $this->assertIdentical(@$events[1]['event'], "add-character");

    // Check the character data
    $this->assertIdentical(json_decode(@$events[0]['data'], true), $charA);
    $this->assertIdentical(json_decode(@$events[1]['data'], true), $charB);

    // Check the event ID has increased
    $this->assertTrue($lastEventId >= $initialEventId + 2,
                      "Last event ID has not increased by the expected amount");
  }

  function testAddCharactersBeforeAndAfterResume() {
    // Read stream
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);

    // Should get start-session event
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "start-session");
    $initialEventId = $lastEventId;

    // Add a character
    $charA = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character A'));

    // Check the stream
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "add-character");
    $this->assertIdentical(json_decode(@$events[0]['data'], true), $charA);

    // Close stream
    $this->closeStream();

    // Add another character
    $charB = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character B'));

    // Re-open stream
    list($stream, $headers) =
      $this->openStream($this->testWall['wallId'], $lastEventId);

    // Check the character data
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "add-character");
    $this->assertIdentical(json_decode(@$events[0]['data'], true), $charB);
  }

  function testShowHideCharacters() {
    // Add a character
    $char = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character'));

    // Read stream
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);

    // Get initial events
    $events = $this->readEvents($stream, $lastEventId);
    $initialEventId = $lastEventId;

    // Hide character
    $this->api->login();
    $this->api->updateCharacter($char['charId'], array('active' => false));

    // Read event
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "remove-character");
    $this->assertIdentical(@intval($events[0]['data']), $char['charId']);
    $this->assertIdentical(@intval($events[0]['id']), $initialEventId + 1);

    // Show character
    $this->api->updateCharacter($char['charId'], array('active' => true));

    // Read event
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "add-character");
    $this->assertIdentical(json_decode(@$events[0]['data'], true), $char);
    $this->assertIdentical(@intval($events[0]['id']), $initialEventId + 2);
  }

  function testShowHideCharactersFromOldSession() {
    // Add a character
    $char = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character'));

    // Start new session
    $this->api->login();
    $session = $this->api->startSession($this->testWall['wallId']);

    // Read stream
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);
    $events = $this->readEvents($stream, $lastEventId);

    // Hide character
    $this->api->updateCharacter($char['charId'], array('active' => false));

    // Check for no events
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 0,
                           "Unexpected number of events: %s");

    // Show character
    $this->api->updateCharacter($char['charId'], array('active' => true));

    // Check for no events
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 0,
                           "Unexpected number of events: %s");
  }

  function testRemoveCharacter() {
    // Add a character
    $char = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character'));

    // Read stream
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);

    // Get initial events
    $events = $this->readEvents($stream, $lastEventId);
    $initialEventId = $lastEventId;

    // Remove character
    $this->api->login();
    $this->api->removeCharacter($char['charId']);

    // Read event
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "remove-character");
    $this->assertIdentical(@intval($events[0]['data']), $char['charId']);
    $this->assertIdentical(@intval($events[0]['id']), $initialEventId + 1);
  }

  function testRemoveCharacterFromOldSession() {
    // Add a character
    $char = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character'));

    // Start new session
    $this->api->login();
    $session = $this->api->startSession($this->testWall['wallId']);

    // Read stream
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);
    $events = $this->readEvents($stream, $lastEventId);

    // Remove character
    $this->api->removeCharacter($char['charId']);

    // Check for no events
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 0,
                           "Unexpected number of events: %s");
  }

  function testAddRemoveSession() {
    // Add character
    $char = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character'));

    // Read stream
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);

    // Get initial events
    $events = $this->readEvents($stream, $lastEventId);
    $initialEventId = $lastEventId;

    // Start session
    $this->api->login();
    $session = $this->api->startSession($this->testWall['wallId']);

    // Read event
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "start-session");
    $this->assertIdentical(@intval($events[0]['id']), $initialEventId + 1);

    // Remove session
    $this->api->deleteSession($this->testWall['wallId'], $session['sessionId']);

    // Read events: Should get a start-session event plus an add-character event
    //              for every character in the previous session.
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 2,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "start-session");
    $this->assertIdentical(@intval($events[0]['id']), $initialEventId + 2);
    $this->assertIdentical(@$events[1]['event'], "add-character");
    $this->assertIdentical(json_decode(@$events[1]['data'], true), $char);
  }

  function testRemoveOldSession() {
    // Remember first session
    $firstSessionId = $this->testWall['latestSession']['sessionId'];

    // Add character
    $char = $this->api->createCharacter($this->testWall['wallId'],
      array('title' => 'Character'));

    // Read stream
    list($stream, $headers) = $this->openStream($this->testWall['wallId']);
    $events = $this->readEvents($stream, $lastEventId);

    // Start a new session
    $this->api->login();
    $session = $this->api->startSession($this->testWall['wallId']);

    // Read event
    $events = $this->readEvents($stream, $lastEventId);
    $this->assertIdentical(count($events), 1,
                           "Unexpected number of events: %s");
    $this->assertIdentical(@$events[0]['event'], "start-session");

    // Remove first session
    $this->api->deleteSession($this->testWall['wallId'], $firstSessionId);

    // Should be no events
    $this->assertIdentical(count($this->readEvents($stream, $lastEventId)), 0,
                          "Generated events when deleting insignificant event");
  }

  // XXX change-duration (during / resume) => change-duration
  // XXX change-design (during / resume) => change-design

  function testDeletedWall() {
    // XXX
  }

  function openStream($wallIdOrPath, $lastEventId = null) {
    // Check there is no request in progress
    if ($this->stream !== null) {
      $this->fail("Stream already open");
      return null;
    }

    // Get URL
    global $config;
    $url = $config['test']['wall_server'] . 'api/walls/'
         . (is_int($wallIdOrPath) ? $wallIdOrPath : "byname/$wallIdOrPath")
         . '/live';
    $url_parts = parse_url($url);

    // Start connection
    $port = isset($url_parts['port']) ? $url_parts['port'] : 80;
    $this->stream = fsockopen($url_parts['host'], $port, $err_num, $err_msg);
    if ($this->stream === FALSE) {
      $this->fail("Couldn't open socket $err_msg [$err_num]");
      $this->stream = null;
      return null;
    }

    // Make request
    stream_set_blocking($this->stream, 0);
    fputs($this->stream, "GET " . $url_parts['path'] . " HTTP/1.1\r\n");
    fputs($this->stream, 'Host: ' . $url_parts['host'] . "\r\n");
    if ($lastEventId !== null) {
      fputs($this->stream, 'Last-Event-ID: ' . $lastEventId . "\r\n");
    }
    fputs($this->stream, "\r\n");

    // Wait for initial response
    if (!$this->waitForStream($this->stream)) {
      $this->fail("No response");
      return null;
    }

    // Parse header
    $headers = $this->readHeaders($this->stream, $lastEventId);
    if (!$headers)
      return null;

    // Check status code
    if (intval($headers['http_code']) !== 200) {
      return array($this->stream, $headers);
    }

    // Check for chunked transfer
    if (!isset($headers['Transfer-Encoding']) ||
      $headers['Transfer-Encoding'] !== 'chunked') {
      $this->fail("Didn't get chunked encoding");
      return null;
    }

    return array($this->stream, $headers);
  }

  function readHeaders($stream) {
    $headers = array();

    // HTTP response code
    $response = fgets($stream);
    if (!$response) {
      $this->fail("No HTTP response");
      return null;
    }
    $headers['http_code'] = substr($response, 9, 3);

    // Other headers
    while ($line = fgets($stream)) {
      if (trim($line) == "")
        break;
      $parts = explode(':', $line, 2);
      if (count($parts) !== 2 || trim($parts[0]) == "") {
        $this->fail("Bad header: $line");
        return null;
      }
      $headers[trim($parts[0])] = trim($parts[1]);
    }

    return $headers;
  }

  function readEvents($stream, &$lastId) {
    // See if there is data already in the buffer
    $data = $this->readData($stream);
    if (!$data) {
      // If not, wait up to 1 second for it
      if (!$this->waitForStream($stream))
        return array();

      // Read again
      $data = $this->readData($stream);
    }

    // Split on double line break
    $events = preg_split("/(\r\n|\r|\n){2}/", $data);

    // HTML says every event must finish with a blank line--so drop anything 
    // after the last double line break
    $events = array_slice($events, 0, count($events) - 1);

    // Parse each event
    $events = array_map("parseEvent", $events);

    // Walk backwards through events to look for any changes to the event ID
    for ($i = count($events) - 1; $i >= 0; $i--) {
      if (isset($events[$i]['id'])) {
        $lastId = $events[$i]['id'];
        break;
      }
    }

    return $events;
  }

  function readData($stream) {
    $data = "";
    while ($chunk = $this->readChunk($stream))
      $data .= $chunk;

    return strlen($data) ? $data : null;
  }

  function readChunk($stream) {
    $firstLine = fgets($stream);
    if (!$firstLine)
      return null;

    // Read chunk size
    if (!preg_match("/^([0-9A-Fa-f]+)(;.*)?\r\n$/", $firstLine, $matches)) {
      $this->fail("Invalid chunk");
      return null;
    }
    $contentLength = hexdec($matches[1]);

    // Read chunk
    $chunk = stream_get_contents($stream, $contentLength);

    // Discard trailing carriage-return linefeed pair
    stream_get_contents($stream, 2);

    return $chunk;
  }

  function waitForStream($stream, $timeout = 1) {
    $read = array($stream);
    $write = null;
    $except = null;
    return stream_select($read, $write, $except, $timeout);
  }

  function closeStream() {
    if ($this->stream) {
      fclose($this->stream); 
      $this->stream = null;
    }
  }
}

/* Callback methods */

function parseEvent($event) {
  $result = array('event' => '', 'data' => '');
  $lines = preg_split("/(\r\n|\r|\n)/", $event);

  foreach($lines as $line) {
    // Comment
    if ($line[0] == ':') {
      if (isset($result["_comments"]))
        array_push($result["_comments"], $line);
      else
        $result["_comments"] = array($line);

    // field: value
    } elseif ($pos = strpos($line, ':')) {
      $field = substr($line, 0, $pos);
      $value = substr($line, $pos+1);
      // Strip initial space if any
      if (strlen($value) && $value[0] === ' ')
        $value = substr($value, 1);
      processField($field, $value, $result);

    // field
    } else {
      processField($line, "", $result);
    }
  }

  return $result;
}

function processField($field, $value, &$event) {
  switch ($field) {
    case 'event':
      $event['event'] .= $value;
      break;

    case 'data':
      $event['data'] .= "$value\n";
      break;

    case 'id':
      $event['id'] = $value;
      break;

    case 'retry':
      $event['id'] = intval($value);
      break;

    default:
      /* Ignore */
      break;
  }
}
?>
