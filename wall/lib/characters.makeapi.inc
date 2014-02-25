<?php
/* vim: set syn=php: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

class CharacterMakeAPI {
  private static function setupClassLoader() {
    spl_autoload_register(function($className) {
      $path = str_replace('\\', DIRECTORY_SEPARATOR, $className);
      require_once 'MakeAPI' .DIRECTORY_SEPARATOR. $path . '.php';
    });
  }

  private static function makeapi($method, $path, $json, $needAuth) {
    CharacterMakeAPI::setupClassLoader();
    global $config;

    $url = @$config['makeapi']['service'].$path;
    $secretkey = @$config['makeapi']['secretkey'];
    $publickey = @$config['makeapi']['publickey'];

    $httpHeader = array('Content-Type: application/json; charset=utf-8');

    if ($needAuth == true) {
      $client = Dflydev\Hawk\Client\ClientBuilder::create()->build();
      $credentials = new Dflydev\Hawk\Credentials\Credentials($secretkey, 'sha256', $publickey);
      $body4hawk = array();
      if ($json != NULL) {
        $body4hawk['payload'] = $json;
        $body4hawk['content_type'] = 'application/json';
      }
      $request = $client->createRequest($credentials, $url, $method, $body4hawk);
      $authorizationHeader = $request->header()->fieldName().': '.$request->header()->fieldValue();
      $httpHeader[] = $authorizationHeader;
    }

    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, FALSE);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($curl, CURLOPT_USERAGENT, $_SERVER["HTTP_USER_AGENT"]);
    if ($json != NULL) {
      curl_setopt($curl, CURLOPT_POSTFIELDS, $json);
    }
    curl_setopt($curl, CURLOPT_HTTPHEADER, $httpHeader);
    $result = curl_exec($curl);
    curl_close($curl);
    return json_decode($result);
  }

  public static function create($url, $contenturl, $title, $author, $wallId, $sessionId) {
    $email = 'parapara@mozilla-japan.org';
    $body = array();
    $body['email'] = $email;
    $body['url'] = $url;
    $body['contenturl'] = $contenturl;
    $body['contentType'] = 'image/svg+xml';
    if (0 == strlen($title)) {
      $title = "UNTITLED";
    }
    $body['title'] = $title;
    $body['tags'] = array('parapara-character', 'wall-'.$wallId, 'session-'.$sessionId);
    if (0 != strlen($author)) {
      $body['author'] = $author;
    }
    $json = json_encode($body);
    $needAuth = true;
    CharacterMakeAPI::makeapi('POST', '', $json, $needAuth);
  }

  public static function remove($url) {
    $needAuth = false;
    $result = CharacterMakeAPI::makeapi('GET', '/search?url='.$url, NULL, $needAuth);
    if ($result->total == 0) {
//      throw new Exception("url is not found in MakeAPI");
      error_log("[remove]url is not found in MakeAPI");
      return;
    }
    $id = $result->makes[0]->_id;
    $needAuth = true;
    CharacterMakeAPI::makeapi('DELETE', '/'.$id, NULL, $needAuth);
  }
}

?>