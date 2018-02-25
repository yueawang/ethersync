alter table ethtx change column blockHash blockHash varchar(66) default NULL;
alter table ethtx change column to2 to2 varchar(42) default NULL;
alter table ethtx change column extra extra text default NULL;

alter table ethtx_0 change column blockHash blockHash varchar(66) default NULL;
alter table ethtx_0 change column to2 to2 varchar(42) default NULL;
alter table ethtx_0 change column extra extra text default NULL;

alter table ethtx_1 change column blockHash blockHash varchar(66) default NULL;
alter table ethtx_1 change column to2 to2 varchar(42) default NULL;
alter table ethtx_1 change column extra extra text default NULL;

update ethtx set blockHash=null where blockHash='';
update ethtx set to2=null where to2='';
update ethblock set miner=null where miner='';
