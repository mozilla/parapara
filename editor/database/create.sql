/* Drop tables in appropriate order to maintain constraints */
DROP TRIGGER IF EXISTS `characters_after_insert`;
DROP TRIGGER IF EXISTS `characters_after_delete`;
DROP TABLE IF EXISTS `changes`;
DROP TABLE IF EXISTS `characters`;

CREATE TABLE `characters` (
  `charId` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(128) DEFAULT NULL,
  `author` varchar(128) DEFAULT NULL,
  `groundOffset` decimal(4,3) DEFAULT '0.000' COMMENT '0.000 - 1.000',
  `width` float DEFAULT NULL COMMENT 'Bounding box width',
  `height` float DEFAULT NULL COMMENT 'Bounding box height',
  `galleryUrlShort` varchar(40) DEFAULT NULL COMMENT 'Shortened URL for the gallery display of this character',
  `createDate` datetime NOT NULL COMMENT 'Creation datetime in UTC',
  PRIMARY KEY (`charId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8;

/* Audit table */

CREATE TABLE `changes` (
  `changeId` int(15) unsigned NOT NULL AUTO_INCREMENT,
  `changeType` enum('add-character', 'remove-character') NOT NULL COMMENT 'The type of change',
  `contextId` int(11) unsigned DEFAULT NULL COMMENT 'The character ID (or, in future, some other ID) corresponding to the change, if appropriate',
  `changeTime` datetime NOT NULL COMMENT 'The time when the change occurred in UTC',
  PRIMARY KEY (`changeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Audit of changes to walls for live streams of events';

/* Audit triggers */

/* add-character */
CREATE TRIGGER `characters_after_insert` AFTER INSERT ON `characters`
  FOR EACH ROW
  INSERT INTO changes (changeType, contextId, changeTime)
    VALUES ('add-character', NEW.charId, UTC_TIMESTAMP());

/* remove-character */
CREATE TRIGGER `characters_after_delete` AFTER DELETE ON `characters`
  FOR EACH ROW
  INSERT INTO changes (changeType, contextId, changeTime)
    VALUES ('remove-character', OLD.charId, UTC_TIMESTAMP());
