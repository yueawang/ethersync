var DbHelper = require('./dbhelper');
var Config = require('./config');
var Log = require('./Log');

const merge_file = Config.sqlMrgFile;
const MAX_DATA_COUNT = 1000*10000;//10milions
const TABLE_PREFIX = "ethtx";
const BLOCK_TABLE_PREFIX = "ethblock";

const TABLE_SEPARATOR = "_";
const PARENT_TABLE = TABLE_PREFIX + TABLE_SEPARATOR + 0;
const BLOCK_PARENT_TABLE = BLOCK_TABLE_PREFIX + TABLE_SEPARATOR + 0;

const PERIOD = 1000 * 60 * 2;
var DEAMON = false;
var SYNC = false;

var fs = require("fs");
var maxIndex = 0;
var oldTables = [];
DbHelper.init();
function onNewLine(line) {
    Log.log('Line from file:', line);
    let arr = line.split(TABLE_SEPARATOR);
    const reg = /^[0-9]+.?[0-9]*$/;

    if (arr && arr.length == 2 && arr[0] == TABLE_PREFIX) {
        if (!reg.test(arr[1])) {
            return;
        }
        oldTables.push(arr[1]);
        if (maxIndex < arr[1]) {
            maxIndex = parseInt(arr[1]);
        }
    }
}

async function onEnd() {
    try {
        Log.log("max index:", maxIndex);
        let results = await DbHelper.executeSql("select count(1) as count from ethtx_" + maxIndex);
        //Log.log("result", results);
        if (results && results.length > 0 && results[0].count > MAX_DATA_COUNT) {
            await onNewTable();
        }
    } catch (error) {
        throw new Error("get count from db error", error);
    }
}

async function onNewTable() {
    Log.log("maxIndex:" + maxIndex);
    let newIndex = parseInt(maxIndex) + 1;
    let newTable = TABLE_PREFIX + TABLE_SEPARATOR + newIndex;
    let newBlockTable = BLOCK_TABLE_PREFIX + TABLE_SEPARATOR + newIndex;
    let tables = oldTables.concat("" + newIndex);
    try {
        const results = await DbHelper.executeSql("select max(number) as num from " + BLOCK_TABLE_PREFIX);
        //Log.log("dbMaxBlock:" + results);
        let maxNum;
        if (results && results.length > 0 && results[0].num) {
            maxNum = results[0].num;
            if (!SYNC) {
                Log.log("max num:" + maxNum, "will delete 13 blocks before");
                maxNum = maxNum - 14;
            }
        } else {
            Log.log("Invalid max num");
            return;
        }

        let union = "";
        for (let i in tables) {
            union = union + "," + TABLE_PREFIX + TABLE_SEPARATOR + tables[i];
        }
        union = union.substring(1);

        await DbHelper.executeSql("create table if not exists " + newTable + " like " + PARENT_TABLE);
        await DbHelper.executeSql("create table if not exists " + TABLE_PREFIX + " like " + PARENT_TABLE);
        await DbHelper.executeSql("create table if not exists " + TABLE_PREFIX + "_new like " + PARENT_TABLE);
        if(!SYNC) {
            await DbHelper.executeSql("delete from " + TABLE_PREFIX  + "_new where blockNumber > " + maxNum);
        }
        await DbHelper.executeSql("alter table " + TABLE_PREFIX + " engine=mrg_myisam union(" + union + ") insert_method=last");
        await DbHelper.executeSql("alter table " + TABLE_PREFIX + "_new engine=mrg_myisam union(" + newTable + ") insert_method=last");

        union = "";
        for (let i in tables) {
            union = union + "," + BLOCK_TABLE_PREFIX + TABLE_SEPARATOR + tables[i];
        }
        union = union.substring(1);
        await DbHelper.executeSql("create table if not exists " + newBlockTable + " like " + BLOCK_PARENT_TABLE);
        await DbHelper.executeSql("create table if not exists " + BLOCK_TABLE_PREFIX + " like " + PARENT_TABLE);
        await DbHelper.executeSql("create table if not exists " + BLOCK_TABLE_PREFIX + "_new like " + PARENT_TABLE);
        if(!SYNC) {
            await DbHelper.executeSql("delete from " + BLOCK_TABLE_PREFIX  + "_new where number > " + maxNum);
        }
        await DbHelper.executeSql("alter table " + BLOCK_TABLE_PREFIX + " engine=mrg_myisam union(" + union + ") insert_method=last");
        await DbHelper.executeSql("alter table " + BLOCK_TABLE_PREFIX + "_new engine=mrg_myisam union(" + newBlockTable + ") insert_method=last");

        await DbHelper.executeSql("flush tables");
        Log.log("split table success, new index:" + (maxIndex + 1));
    } catch (error) {
        Log.log("create table error", error);
    }
}

async function checkDb() {
    Log.log("checkDb");
    /*var lineByLine = require('n-readlines');
    var liner = new lineByLine(merge_file);

    var line;
    while (line = liner.next()) {
        onNewLine(line.toString('ascii'));
    }*/

    oldTables = [];
    //const results = await DbHelper.executeSql("SHOW TABLES FROM " + Config.db.database);
    const results = await DbHelper.executeSql("SHOW CREATE TABLE " + TABLE_PREFIX);
    if (!results && results.length <=0) {
        Log.log("invalid merge table");
        return;
    }
    let values = results[0]['Create Table'].match(/ethtx_[0-9,a-z,A-Z]+/g)
    Log.log("merge tables", values);
    for (item of values) {
        //onNewLine(item['Tables_in_' + Config.db['database']]);
        onNewLine(item);
    }
    await onEnd()
}

function parseArgs() {
    var program = require('commander');

    program
      .version('0.1.0')
      .option('-d, --deamon', 'demon mode')
      .option('-s, --sync', 'sync mode')
      .parse(process.argv);

    if (program.sync) {
        SYNC =true;
    }
    if (program.deamon) {
        DEAMON =true;
    }
    Log.log("SYNC=" + SYNC + ", DEAMON=" + DEAMON);
}

async function start() {
    await DbHelper.init();
    await checkDb();
    if (DEAMON) {
        const intervalObj = setInterval(() => {
            checkDb();
        }, PERIOD);
    } else {
        process.exit()
    }
}

parseArgs();
start();
