DROP TABLE IF EXISTS `designs`;
CREATE TABLE `designs` (
  `designId` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'A descriptive name for the type of design. This will need to be localized eventually.',
  `thumbUrl` varchar(255) DEFAULT NULL COMMENT 'A URL to a thumbnail image of the design. Relative paths should probably be relative to some designs folder.',
  `duration` int(8) DEFAULT NULL COMMENT 'Default duration of this design',
  PRIMARY KEY (`designId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COMMENT='Catalogue of wall styles';

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `userId` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COMMENT='Users of wall system';

DROP TABLE IF EXISTS `walls`;
CREATE TABLE `walls` (
  `wallId` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Identifier of the wall',
  `owner` int(11) unsigned NOT NULL COMMENT 'The user id of the person who created and manages the wall',
  `designId` int(11) unsigned NOT NULL COMMENT 'The design template on which the wall is based',
  `eventName` varchar(255) NOT NULL,
  `eventDescr` text,
  `eventLocation` varchar(255) DEFAULT NULL,
  `eventType` varchar(255) DEFAULT NULL COMMENT 'Might become an enum of things like education etc.?',
  `eventFinish` datetime DEFAULT NULL COMMENT 'UTC Time',
  `galleryDisplay` tinyint(1) NOT NULL COMMENT 'Should this wall be shown in the public gallery when the event finishes?',
  `passcode` varchar(40) DEFAULT NULL COMMENT 'Optional passcode to restrict posting to the wall. Encrypted with SHA1 since this is not used for anything particularly sensitive.',
  `urlPath` varchar(255) NOT NULL COMMENT 'The path component of the URL, e.g. ''fukushima-100''',
  `shortUrl` varchar(40) DEFAULT NULL COMMENT 'Shortened URL for the wall',
  `editorShortUrl` varchar(40) DEFAULT NULL COMMENT 'Shortened URL for the editor associated with this wall',
  `duration` int(8) DEFAULT NULL COMMENT 'The number of milliseconds for a single iteration?',
  `createDate` datetime NOT NULL COMMENT 'Creation datetime in UTC',
  `modifyDate` datetime NOT NULL COMMENT 'Modification datetime in UTC',
  PRIMARY KEY (`wallId`),
  FOREIGN KEY (`designId`) REFERENCES `designs` (`designId`),
  FOREIGN KEY (`owner`) REFERENCES `users` (`userId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COMMENT='Walls are shared drawing spaces';

DROP TABLE IF EXISTS `characters`;
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `wallId` int(11) unsigned NOT NULL,
  `sessionId` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `beginDate` datetime NOT NULL COMMENT 'Creation datetime in UTC',
  `endDate` datetime DEFAULT NULL COMMENT 'End datetime in UTC',
  FOREIGN KEY (`wallId`) REFERENCES walls(`wallId`),
  PRIMARY KEY (`sessionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='sessions of wall';

CREATE TABLE `characters` (
  `charId` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `sessionId` int(11) unsigned NOT NULL,
  `title` varchar(128) DEFAULT NULL,
  `author` varchar(128) DEFAULT NULL,
  `y` int(4) DEFAULT NULL,
  `x` int(4) DEFAULT NULL COMMENT '0 - 1000',
  `createDate` datetime NOT NULL COMMENT 'Creation datetime in UTC',
  `active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indicates if the character should show on the wall',
  PRIMARY KEY (`charId`),
  FOREIGN KEY (`sessionId`) REFERENCES sessions(`sessionId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8;

