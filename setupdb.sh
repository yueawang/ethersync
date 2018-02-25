#!/bin/bash
CMD_PATH=$(cd `dirname $0`; pwd)
if [ "x"$YIYA_CONFIG_NAME = "x" ];then
    dbName=ethdb
else
    dbName=ethdb_$YIYA_CONFIG_NAME
fi
pattern="s/@dbName/"$dbName"/g"
tmpFile=/tmp/ethtx_$dbName.sql
#echo $pattern
sed -e $pattern $CMD_PATH/ethtx_merge.sql > $tmpFile
echo "please input mysql password:"
mysql -uroot -p < $tmpFile
