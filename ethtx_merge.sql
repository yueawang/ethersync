CREATE DATABASE IF NOT EXISTS @dbName DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE @dbName;
CREATE TABLE IF NOT EXISTS `ethtx`(
		`id` bigint NOT NULL AUTO_INCREMENT,
		`hash` varchar(66) NOT NULL,
		`blockHash` varchar(66) DEFAULT NULL,
		`blockNumber` bigint  NOT NULL,
		`from` varchar(42) NOT NULL,
		`to` varchar(42)  NOT NULL,
		`to2` varchar(42)  DEFAULT NULL,
		`nonce` bigint NOT NULL,
		`gas` bigint NOT NULL,
		`gasPrice` bigint NOT NULL,
		`gasUsed` bigint NOT NULL,
		`value` varchar(64) NOT NULL,
		`confirming` tinyint(4) NOT NULL default 0,
		`status` tinyint(4) default NULL,
		`timestamp` bigint,
		`type` int NOT NULL,
		`extra` text DEFAULT NULL, 
		`input` text DEFAULT NULL,
		PRIMARY KEY (`id`)
	)ENGINE=myisam DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

create unique index UNI_hash on ethtx(`hash`);
create index IDX_to on ethtx(`to`);
create index IDX_to2 on ethtx(`to2`);
create index IDX_from on ethtx(`from`);

create table ethtx_0 like ethtx;
create table ethtx_new like ethtx;
alter table ethtx engine=mrg_myisam union=(ethtx_0) insert_method=last; 
alter table ethtx_new engine=mrg_myisam union=(ethtx_0) insert_method=last; 

CREATE TABLE IF NOT EXISTS `ethblock`(
		`hash` varchar(66) NOT NULL,
		`number` bigint  NOT NULL,
		`miner` varchar(66) DEFAULT NULL,
		`txcount` int(8) NOT NULL,
		`synced` tinyint NOT NULL DEFAULT 0,
		`confirmed` tinyint NOT NULL DEFAULT 0,
		`timestamp` bigint,
		PRIMARY KEY (`number`)
	)ENGINE=myisam DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

create unique index UNI_hash on ethblock(`hash`);
create table ethblock_0 like ethblock;
create table ethblock_new like ethblock;
alter table ethblock engine=mrg_myisam union=(ethblock_0) insert_method=last; 
alter table ethblock_new engine=mrg_myisam union=(ethblock_0) insert_method=last; 

CREATE TABLE IF NOT EXISTS `wallet`(
		`id` bigint NOT NULL AUTO_INCREMENT,
		`address` varchar(66) NOT NULL,
		`name` varchar(66) NOT NULL,
		`confirmed` int(4) NOT NULL default 0,
		PRIMARY KEY (`id`)
	)ENGINE=innodb DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

create unique index IDX_address on wallet(`address`);

CREATE TABLE IF NOT EXISTS `alias`(
		`id` bigint NOT NULL AUTO_INCREMENT,
		`uuid` varchar(66) NOT NULL,
		`alias` varchar(66) NOT NULL,
		`confirmed` int(4) NOT NULL default 0,
		PRIMARY KEY (`id`)
	)ENGINE=innodb DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

create unique index IDX_uuid on alias(`uuid`);

CREATE TABLE IF NOT EXISTS `walletalias`(
		`id` bigint NOT NULL AUTO_INCREMENT,
		`address` varchar(66) NOT NULL,
		`alias` varchar(66) NOT NULL,
		`uuid` varchar(66) NOT NULL,
		PRIMARY KEY (`id`)
	)ENGINE=innodb DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

create index IDX_address on walletalias(`address`);

CREATE TABLE IF NOT EXISTS `token`(
		`id` bigint NOT NULL AUTO_INCREMENT,
		`name` varchar(30) NOT NULL,
		`symbol` varchar(30) NOT NULL,
		`unit` varchar(30) NOT NULL,
		`address` varchar(42) NOT NULL,
		`icon` text NOT NULL,
		`price` DOUBLE(10,2) NOT NULL DEFAULT 0,
		`decimal` int(10) NOT NULL,
		`timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`)
	)ENGINE=innodb DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

create index IDX_address on token(`address`);

CREATE TABLE IF NOT EXISTS `exrate`(
		`id` bigint NOT NULL AUTO_INCREMENT,
		`name` varchar(30) NOT NULL,
		`symbol` varchar(30) NOT NULL,
		`value` varchar(42) NOT NULL,
		`time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`)
	)ENGINE=innodb DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON *.* TO test@"localhost" IDENTIFIED BY "yiya";
flush privileges;
