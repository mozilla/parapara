<?php
/* vim: set syn=php: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

require_once("parapara.inc");
require_once("exceptions.inc");
require_once("template.inc");
require_once("Mail.php");

class CharacterEmailer {
  public static function isEmailEnabled() {
    global $config;
    return strlen(@$config['mail']['transport']) > 0;
  }

  public static function sendEmail($char, $address,
                                   $locale = null, $mailer = null) {
    // We'll need this for to from address, template location, mailer etc.
    global $config;

    // Check email is possible
    if (!self::isEmailEnabled() && !$mailer)
      throw new KeyedException('email-disabled');

    // Validate address
    $address = trim($address);
    if (!strlen($address)) {
      throw new KeyedException('bad-email', 'No email address supplied');
    }
    // We'd like to use filter_var($address, FILTER_VALIDATE_EMAIL) here but I'm
    // pretty sure it doesn't support IDNs and idn_to_ascii operates on a domain
    // not an email address (and splitting out the domain, converting it, and
    // adding it back in appears to be non-trivial since @ symbols can be
    // escaped).

    // Get email template
    $locale = trim($locale);
    $templateFile = getTemplateFileForLocale('email_anim', $locale);
    if (!$templateFile)
      throw new KeyedException('server-error');

    // Compile template
    $template = compileEmailTemplate($templateFile,
      array("url" => $char->galleryUrl,
            "author" => $char->author,
            "title" => $char->title));
    if (!$template)
      throw new KeyedException('server-error');

    // Prepare mail
    $headers['From']         = $config['mail']['from'];
    $headers['To']           = $address;
    $headers['Subject']      = $template['subject'];
    $headers['Content-Type'] = "text/plain; charset=UTF-8";
    $headers['Content-Transfer-Encoding'] = "8bit";

    // Get mail object
    if (!$mailer) {
      $mailer =&
        Mail::factory($config['mail']['transport'], $config['mail']['params']);
      if (PEAR::isError($mailer)) {
        error_log($mailer->getMessage() . ', '
                  . $mailer->getDebugInfo());
        throw new KeyedException('sending-failed');
      }
    }

    // Send mail
    $sendResult = $mailer->send($address, $headers, $template['body']);
    if (PEAR::isError($sendResult)) {
      error_log($sendResult->getMessage() . ', '
                . $sendResult->getDebugInfo());
      throw new KeyedException('sending-failed');
    }
  }
}

?>
