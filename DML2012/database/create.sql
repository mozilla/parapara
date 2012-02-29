DROP TABLE IF EXISTS `characters`;
CREATE TABLE `characters` (
  `id` int(10) unsigned NOT NULL auto_increment,
  `title` varchar(128) default NULL,
  `author` varchar(128) default NULL,
  `y` int(11) default NULL,
  `x` int(11) default NULL,
  `rtime` bigint(20) unsigned NOT NULL,
  `active` tinyint(1) NOT NULL default '1' COMMENT 'Indicates if the character should show on the wall',
  PRIMARY KEY  (`id`)
);
