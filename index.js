var Web3 = require('web3');
var Log = require('./Log');
var process = require('process');
var DbHelper = require('./dbhelper');
var net = require('net');
var Config = require('./config');
var JPushUtils = require('./jpushutils');
var SYNC = false;
var FAST_MODE = false;
var CONFIRMATION_BLOCKS = 12;
var START_BLOCK_NUM = 0;
var END_BLOCK_NUM = null;
var ONLY_STATUS = null;
var CHECK_STATUS = null;
var PENDING = null;
var UPDATE_BLOCK_NUM = null;

var DEBUG = false;
var FIX = false;
var DEBUG_COST = false;
var PARSE_CONTRACT = false;
var globalBlockNumber = 0;

var web3 = new Web3(new Web3.providers.IpcProvider(Config.gethipc, net));

const TRANSACTION_TYPE_DEFAULT  = 0;
const TRANSACTION_TYPE_CONTRACT = 1;

const PUSH_NOTIFICATION = false;
const CONFIRMATION_BY_STEP12 = true;
const ETH_ADDRESS = '0x0';
//TODO:ENABLE_BATCH should be off
const ENABLE_BATCH = false;

function getNowFormatDate() {
    var date = new Date();
    var seperator1 = "-";
    var seperator2 = ":";
    var month = date.getMonth() + 1;
    var strDate = date.getDate();
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate
            + " " + date.getHours() + seperator2 + date.getMinutes()
            + seperator2 + date.getSeconds();
    return currentdate;
}

async function _getToken(address) {
    try {
        const results = await DbHelper.executeSql("select * from token where address='" + address + "'");
        if (results && results.length > 0 && results[0].address) {
            return results[0];
        } else {
            return null;
        }
    } catch (error) {
        throw new Error("isContract from db error", error);
        return null;
    }
}

function _parseContractInput(input) {
    //console.log("parse contract:" + input)
    var abi = require('./abi');

    let result = abi.decodeInput(input);
    if (!result || result.length == 0 || !result.method) {
        //console.log("invalid contract input")
        return null;
    }
    let newResult = {}
    newResult.method = result.method;
    newResult['inputs'] = {}
    for (i in result.inputs) {
        if (result.fieldTypes[i] == 'address') {
            newResult.inputs[result.fieldNames[i]] = "0x" + result.inputs[i].toString("hex")
        } else {
            newResult.inputs[result.fieldNames[i]] = result.inputs[i].toString()
        }
    }
    return newResult;
}

async function notifyConfirmedTransaction(tx) {
    if(FIX || SYNC || ONLY_STATUS) {
        //Skip notification
        return;
    }
    let isContract = tx.type == TRANSACTION_TYPE_CONTRACT;
    let unit, decimal, realTo;
    if (isContract) {
        let token = await _getToken(tx.to);
        unit = token ? token.unit : 'unknown';
        decimal = token ? token.decimal : 18;
        realTo = tx.to2;
    } else {
        let token = await _getToken(ETH_ADDRESS);
        unit = token ? token.unit : 'ether';
        decimal = token ? token.decimal : 18;
        realTo = tx.to;
    }
    let pushFunc = PUSH_NOTIFICATION ? JPushUtils.pushNotification : JPushUtils.pushMessage
    try {
        const sql = "select * from walletalias where address ='" + realTo + "'";
        const results = await DbHelper.executeSql(sql);
        if (results) {
            results.forEach((item) => {
                Log.log("push newtransaction to alias" + item.alias + " for:" + tx.hash);
                pushFunc(item.alias, "转账通知", "value:" + tx.value + ",from:" + tx.from, {
                    ...tx,
                    unit,
                    decimal,
                    msgType: "newtransaction",
                });
            })
        }
    } catch (error) {
        Log.log("push transactoin to target user error" + error);
    }
    try {
        const sql = "select * from walletalias where address ='" + tx.from + "'";
        const results = await DbHelper.executeSql(sql);
        if (results) {
            results.forEach((item) => {
                Log.log("push confirmtransaction to alias" + item.alias + " for:" + tx.hash);
                pushFunc(item.alias, "交易确认", "value:" + tx.value + ", to" + realTo, {
                    ...tx,
                    unit,
                    decimal,
                    msgType: "confirmtransaction",
                });
            })
        }
    } catch (error) {
        Log.log("push new transactoin to from user error" + error);
    }
}

async function parseContract(tx) {
    // let token = await _getToken(tx.to);
    let isContract = false
    let to2 = null;
    let extra = null;
    if (PARSE_CONTRACT && tx.to) {
        input = _parseContractInput(tx.input)
        if (input && input.method == 'transfer') {
            isContract = true;
            to2 = input.inputs._to;
            extra = {
                to: to2,
                value: input.inputs._value,
                input,
            };
            if (to2 && to2.length < 42) {
                let supText = "";
                for(let i =0; i< 42-to2.length;i++) {
                    supText = supText + "0";             
                }
                to2 = to2.replace('0x', '0x' + supText);
            }
        }
    }
    tx.extra = isContract ? JSON.stringify(extra):null
    tx.to2 = to2
    tx.type = isContract?TRANSACTION_TYPE_CONTRACT:TRANSACTION_TYPE_DEFAULT
    return tx
}

async function getTransaction(hash, block) {
    let receipt = await web3.eth.getTransactionReceipt(hash)
    if (!receipt) {
        Log.log("invalid transaction,no receipt," + hash + "," + block.number + "," + block.hash);
        return null;
    }
    let tx = await web3.eth.getTransaction(hash);
    tx = await parseContract(tx)
    let status = receipt.status == 'null' || receipt.status === undefined ?null:receipt.status;
    let confirming;
    if (tx.blockNumber < (globalBlockNumber- CONFIRMATION_BLOCKS)) {
        confirming = 0;
    } else {
        confirming = 1;
    }
    let newTx = {
        hash:tx.hash,
        blockHash:block.hash,
        blockNumber:tx.blockNumber,
        gas:tx.gas,
        gasPrice:tx.gasPrice,
        nonce:tx.nonce,
        from:tx.from,
        to:tx.to?tx.to:"",
        input:tx.input,
        value:tx.value,

        gasUsed:receipt.gasUsed,
        status,
        to2:tx.to2,
        type:tx.type,
        timestamp:block.timestamp,
        confirming,
        extra:tx.extra,
    };
    return newTx;
}

async function onNewTransactions(txs, commit=false) {
    let sql = 'INSERT IGNORE INTO ethtx SET ?';

    try {
        const results = await DbHelper.executeSql(sql, txs, commit);
    } catch (error) {
        throw "Insert transactions error " + error;
    }
}

async function onNewTransaction(tx, commit=false) {
    //Log.log("newtransaction");
    if (DEBUG) {
         Log.log(tx.hash);
    }
    if (tx.status === null || tx.status === undefined) {
        tx.status = null;
    } else {
        tx.status = parseInt(tx.status);
    }
    if (ONLY_STATUS) {
        let sql = "update ethtx_new set ? where hash='" + tx.hash + "'";
        try {
            let result = await DbHelper.executeSql(sql, tx, commit);
            if (result && result.affectedRows > 0) {
                //Log.log("affected rows:" + result.affectedRows);
                return; 
            }
        } catch (error) {
            throw "update transaction error " + error;
        }
        return;
    }
    const updateString = "blockNumber=" + tx.blockNumber +
        ",blockHash='" + tx.hash + "'" +
        ",gasUsed=" + tx.gasUsed +
        ",status=" + tx.status +
        ",confirming=" + tx.confirming +
        ",timestamp=" + tx.timestamp
    let sql;
    if (FIX) {
        sql = 'INSERT INTO ethtx_new SET ? ON DUPLICATE KEY UPDATE ' + updateString;
    } else {
        sql = 'INSERT INTO ethtx SET ? ON DUPLICATE KEY UPDATE ' + updateString;
    }
    try {
        await DbHelper.executeSql(sql, tx, commit);
    } catch (error) {
        throw "Insert transaction error " + error;
    }
    try {
        await notifyConfirmedTransaction(tx)
    } catch (error) {
        throw "notify confirmed issue" + error;
    }
}

async function addNewBlock(block, syncedTransaction) {
    if (!block) {
        Log.log("null block")
        Log.log(block);
        return;
    }
    let updateString;
    if (FIX) {
        if (syncedTransaction) {
            updateString = "synced=3";
        } else {
            updateString = "synced=2";
        }
    } else {
        if (syncedTransaction) {
            updateString = "synced=1";
        } else {
            updateString = "synced=0";
        }
    }
    let confirmed;
    if (block.number < (globalBlockNumber- CONFIRMATION_BLOCKS)) {
        confirmed = 1;
    } else {
        confirmed = 0;
    }
    if (DEBUG) { 
        Log.log("confirmed:" + confirmed + " for:" + block.number);
    }
    updateString = updateString + ",confirmed=" + confirmed;
    let sql;
    if (FIX) {
        sql = 'INSERT INTO ethblock_new SET ? ON DUPLICATE KEY UPDATE ' + updateString;
    } else {
        sql = 'INSERT INTO ethblock SET ? ON DUPLICATE KEY UPDATE ' + updateString;
    }
    let params = {
        hash:block.hash,
        number:block.number,
        txcount:block.transactions.length,
        synced:syncedTransaction,
        timestamp:block.timestamp,
        confirmed,
    };
    try {
        const results = await DbHelper.executeSql(sql, params, true);
    } catch (error) {
        throw "Insert newBlock error " + error;
    }
}

async function onPendingTransaction(hash) {
    //Log.log("newpendingtransaction");
    //Log.log(tx.hash);
    let tx = await web3.eth.getTransaction(hash);
    tx = await parseContract(tx)
    let blockNumber = await web3.eth.getBlockNumber()
    globalBlockNumber = blockNumber;
    if (!blockNumber) {
        Log.log("No block number");
        return;
    }
    let newTx = {
        hash:tx.hash,
        blockHash:null,
        blockNumber:blockNumber,
        gas:tx.gas,
        gasPrice:tx.gasPrice,
        nonce:tx.nonce,
        from:tx.from,
        to:tx.to?tx.to:"",
        input:tx.input,
        value:tx.value,

        gasUsed:0,
        status:null,
        to2:tx.to2,
        type:tx.type,
        timestamp:Math.round(new Date().getTime()/1000),
        confirming:0,
        extra:tx.extra,
    };
    let sql = 'INSERT IGNORE INTO ethtx SET ?';
    try {
        const results = await DbHelper.executeSql(sql, newTx, true);
    } catch (error) {
        Log.log("Insert data error " + error);
    }
}

async function getBlockTransactionData(blockNum) {
    if (END_BLOCK_NUM && blockNum >= END_BLOCK_NUM) {
        Log.log("curNum:" + blockNum + " exceeds " + END_BLOCK_NUM);
        return;
    }
    let start;
    if (DEBUG_COST) {
       start = new Date().getTime();
    }
    try{ 
        Log.log("" + getNowFormatDate());
    } catch(error) {
        Log.log("log date erro" + error);
    }
    Log.log("getBlockTransactionData:" + blockNum);
    let syncedTransaction = true;
    let result;
    try {
        result = await web3.eth.getBlock(blockNum);
    } catch (error) {
        Log.log("getBlock error" + error);
        return;
    }
    let length = 0;
    try {
        if (result.transactions && result.transactions.length > 0) {
            if (DEBUG_COST) {
                length = result.transactions.length;
            }
            let transactions = []
            for (let i = 0; i < result.transactions.length; i++) {
                try {
                    const transaction = await getTransaction(result.transactions[i], result);
                    if (!transaction) {
                        syncedTransaction = false;
                        continue;
                    }
                    if (ENABLE_BATCH) {
                        transactions = transactions.concat(transaction)
                        if (transactions.length > MAX_INSERT_COUNT) {
                            await onNewTransactions(transactions, false);
                            //Log.log("inserted " + transactions.length);
                            transactions = []
                        }
                    } else  {
                        await onNewTransaction(transaction, false);
                    }
                } catch(error) {
                    Log.log("get one transcation error", error);
                }
            }
            if (ENABLE_BATCH && transactions.length > 0) {
                await onNewTransactions(transactions, false);
                //Log.log("inserted " + transactions.length);
            }
            await DbHelper.commit();
        }
    } catch (error) {
        Log.log("syncTransaction error" + error + " at index:" + blockNum);
        syncedTransaction = false;
    }
    try {
        await addNewBlock(result, syncedTransaction);
    } catch (error) {
        Log.log("addNewBlock error" + error);
    }
    if (DEBUG_COST) {
        let cost = new Date().getTime() - start;
        Log.log("cost:" + cost + ", length:" + length);
    }
}

async function updateBlock() {
    try {
        const result = await web3.eth.getBlockNumber();
        globalBlockNumber = result;
        await updateTrasactionData(result);
    } catch (error) {
        Log.log("getBlockNumber error:", error);
    }
}

async function updateTrasactionData(curBlockNum) {
    try {
        Log.log("dbnum:" + this.dbBlockNumber + " netnum:" + curBlockNum);
        if (END_BLOCK_NUM && curBlockNum>= END_BLOCK_NUM) {
            curBlockNum = END_BLOCK_NUM-1;
            Log.log("dbnum:" + this.dbBlockNumber + " endnum:" + curBlockNum);
        }
        for (var blockNum=(this.dbBlockNumber+1); blockNum <= curBlockNum; blockNum++) {
            await getBlockTransactionData(blockNum);
            this.dbBlockNumber = blockNum;
        }
    } catch (error) {
        Log.log("updateTransactionData error:" + error);
    }
}

async function syncPendingBlock() {
    try {
        if (CHECK_STATUS) {
            await updateAllTrasactionStatus();
        }
    } catch(error) {
        Log.log("updateAllTrasactionStatus error", error);
    }
    try {
        const results = await DbHelper.executeSql("select max(number) as num from ethblock");
        //Log.log("dbMaxBlock:" + results);
        if (results && results.length > 0 && results[0].num) {
            this.dbBlockNumber = results[0].num;
        } else {
            this.dbBlockNumber = -1;
        }
        if (this.dbBlockNumber < START_BLOCK_NUM - 1) {
            this.dbBlockNumber = START_BLOCK_NUM - 1;
        }
        await updateBlock();
    } catch (error) {
        Log.log("sync pending block error", error);
    }
}

async function syncFailBlock() {
    let results = null;
    try {
        results = await DbHelper.executeSql("select number from ethblock_new where synced=0 limit 1000");
    } catch (error) {
        throw new Error("get fail block error", error);
    }
    if (!results || results.length <= 0) {
        return true;
    }
    for (let i in results) {
        try {
            Log.log("Fix block:" + results[i].number);
            await DbHelper.executeSql("delete from ethtx_new where blockNumber=" + results[i].number);
            await getBlockTransactionData(results[i].number);
        } catch (error) {
            Log.log("sync fail block error", error);
        }
    }
    return false;
}

var isUpdating = false;

async function confirmTransaction(item) {
    //Log.log(item.hash)
    const receipt = await web3.eth.getTransactionReceipt(item.hash);
    //Double check whether the transaction is valid
    if (receipt) {
        let status = receipt.status == 'null' || receipt.status === undefined ?null:receipt.status;
        if (receipt.blockNumber != item.blockNumber) {
            Log.log("Invalid status, tx has packed in another block:" + receipt.blockNumber);
            Log.log(item);
            Log.log(receipt);
            const block = await web3.eth.getBlock(receipt.blockNumber);
            sql = "update ethtx set ? where hash = '" + item.hash + "'";
            params = {
                blockNumber: receipt.blockNumber,
                blockHash: block.hash,
                gasUsed: receipt.gasUsed,
                status,
                timestamp: block.timestamp,
            }
            await DbHelper.executeSql(sql, params);
            return;
        }
        await DbHelper.executeSql("update ethtx set confirming = 0 where hash = '" + item.hash + "'");
    } else {
        Log.log("transaction is dropped, switch to pending status, " + item.hash);
        sql = "update ethtx set ? where hash = '" + item.hash + "'";
        params = {
            blockHash:null,
            gasUsed:0,
            confirming:0,
            status:null,
        }
        await DbHelper.executeSql(sql, params);
    }
}

async function updateBlockStatus(curBlockNum) {
    try {
        const results = await DbHelper.executeSql("select * from ethblock_new where confirmed=0 and number<" + (curBlockNum - CONFIRMATION_BLOCKS) + " limit 500");
        if (!results || results.length <= 0) {
            return;
        }
        if (DEBUG) {
            Log.log("pending status block size:" + results.length);
        }
        for (let item of results) {
            await getBlockTransactionData(item.number);
        }
    } catch (error) {
        Log.log("updateTrasactionStatus error", error);
    }
}

async function updateTrasactionStatus(times=1) {
    if (isUpdating) {
        return false;
    }
    isUpdating = true;
    let curBlockNum = globalBlockNumber;
    await updateBlockStatus(curBlockNum);
    for (let i=0; i<times; i++) {
        try {
            const results = await DbHelper.executeSql("select * from ethtx_new where confirming=1 and blockNumber<" + (curBlockNum - CONFIRMATION_BLOCKS) + " and blockNumber>" + (curBlockNum - 10*CONFIRMATION_BLOCKS) + " limit 500");
            if (!results || results.length <= 0) {
                break;
            }
            if (DEBUG) {
                Log.log("pending status tx size:" + results.length);
            }
            for (let item of results) {
                await confirmTransaction(item)
            }
            await DbHelper.commit();
        } catch (error) {
            Log.log("updateTrasactionStatus error", error);
        }
    }
    isUpdating = false;
}

async function updateAllTrasactionStatus() {
    if (isUpdating) {
        return false;
    }
    isUpdating = true;
    let curBlockNum = 0;
    try {
        const result = await web3.eth.getBlockNumber();
        curBlockNum = result;
        globalBlockNumber = result;
    } catch (error) {
        Log.log("getBlockNumber error:", error);
        return;
    }
    await updateBlockStatus(curBlockNum);
    let curId = 0;
    let length = 1000;
    while (length >= 500) {
        length = 0;
        try {
            const results = await DbHelper.executeSql("select * from ethtx_new where confirming=1 and id >" + curId + " and blockNumber<" + (curBlockNum - CONFIRMATION_BLOCKS) + " limit 500");
            if (!results || results.length <= 0) {
                break;
            }
            length = results.length;
            if (DEBUG) {
                Log.log("pending status tx size:" + results.length);
            }
            for (let item of results) {
                await confirmTransaction(item)
                if (curId < item.id) {
                    curId = item.id;
                }
            }
            await DbHelper.commit();
        } catch (error) {
            Log.log("updateTrasactionStatus error", error);
        }
    }
    isUpdating = false;
}

async function onNewBlock(blockHeader) {
    Log.log(blockHeader.number);
    globalBlockNumber = blockHeader.number;
    if (END_BLOCK_NUM && blockHeader.number >= END_BLOCK_NUM) {
	    throw new Error("reach end block num:" + END_BLOCK_NUM);
    }
    if (ONLY_STATUS) {
	    updateTrasactionStatus(6);
	    return;
    } else if (CHECK_STATUS) {
	    updateTrasactionStatus();
    }
    if (!FAST_MODE) {
	    updateTrasactionData(blockHeader.number);
    } else {
	    getBlockTransactionData(blockHeader.number);
    }
}

const defaultIntervalTime = 1000*60*5; //5minutes;
const MAX_TIMES_ONCE = 10;
var isFixing = false;
var interval = null;
async function startFix() {
    if (isFixing) {
        return;
    }
    isFixing = true;
    let times = 0;
    let synced = false;
    while(!synced && times < MAX_TIMES_ONCE) {
        try {
            synced = await syncFailBlock();
        } catch (error) {
            Log.log("fix error", error);
        }
        times++;
    }
    Log.log("Fix finished synced:" + synced);
    if (!interval) {
        interval = setInterval(() => {
            startFix();
        }, defaultIntervalTime);
    }
    isFixing = false;
}

async function start() {
    this.dbBlockNumber = -1;
    await DbHelper.init();
    if (FIX) {
        startFix();
        return;
    }
    if (UPDATE_BLOCK_NUM) {
        getBlockTransactionData(UPDATE_BLOCK_NUM);
        return;
    }
    if (!FAST_MODE && !ONLY_STATUS) {
        await syncPendingBlock();
    }
    Log.log("Sync finished");
    const subscriber = web3.eth.subscribe('newBlockHeaders', function(error, result){
        if (error){
            Log.log(error);
        }
    }).on("data", function(blockHeader){
        onNewBlock(blockHeader);
    });
    if (PENDING) {
        try{
            web3.eth.subscribe('pendingTransactions', function(error, result){
                if (!error) {
                //console.log(result);
                } else {
                Log.log(error);
                }
            }).on("data", function(hash){
                 //Log.log("pending");
                 //Log.log(hash);
                 onPendingTransaction(hash);
            });
        } catch(error) {
            Log.log("not support pending error");
        }
    }
}

function parseArgs() {
    var program = require('commander');

    program
      .version('0.1.0')
      .option('-d, --debug', 'debug')
      .option('-s, --sync', 'sync transaction')
      .option('-x, --fix', 'fix failed blocks')
      .option('-p, --perform', 'perform info')
      .option('-f, --fast', 'fast mode, only sync futher transaction')
      .option('--checkstatus', 'check status')
      .option('--onlystatus', 'only status')
      .option('--pending', 'monitor pending')
      .option('-t, --contract', 'parse contract')
      .option('-i, --ipc <string>', 'ipc path')
      .option('-c, --confirms <string>', 'ipc path')
      .option('-s, --start <string>', 'start block')
      .option('-e, --end <string>', 'end block')
      .option('-u, --updateblock <string>', 'update block')
      .parse(process.argv);

    if (program.perform) {
         DEBUG_COST=true;
    }
    if (program.debug) {
         DEBUG=true;
         DEBUG_COST=true;
    }
    if (program.sync) {
         SYNC=true;
    }
    if (program.fix) {
        SYNC=true;
        FIX=true;
    }
    if(program.fast) {
         FAST_MODE=true;
    }
    if(program.contract) {
        PARSE_CONTRACT=true;
    }
    if(program.onlystatus) {
        ONLY_STATUS=true;
    }
    if(program.checkstatus) {
        CHECK_STATUS=true;
    }
    if(program.pending) {
        PENDING=true;
    }
    if(program.confirms) {
         CONFIRMATION_BLOCKS = program.confirms;
    }
    if(program.start) {
         START_BLOCK_NUM = parseInt(program.start);
    }
    if(program.end) {
         END_BLOCK_NUM = parseInt(program.end);
    }
    if(program.updateblock) {
         UPDATE_BLOCK_NUM = parseInt(program.updateblock);
    }
    Log.log("sync=" + SYNC + ",fast=" + FAST_MODE + ",confirms=" + CONFIRMATION_BLOCKS + ",start=" + START_BLOCK_NUM + ",end=" + END_BLOCK_NUM + ",fix=" + FIX + ", perform=" + DEBUG_COST + ", contract=" + PARSE_CONTRACT + ", onlystatus=" + ONLY_STATUS +", checkstatus=" + CHECK_STATUS + ", pending=" + PENDING + ", updateBlock=" + UPDATE_BLOCK_NUM);
}

async function testTx() {
    await DbHelper.init();
    const txStr = '{"hash":"0x7a654e04ee5793d03991a50755e8a514213de9c90843a4ffc16486e648ae8a93","blockHash":"0x49f1fe9b41390b6c1dbfaac4531659a5f49d2f76611be401b6f14ba3d33c5b77","blockNumber":"2080176","from":"0x77F71e7C2Be802cc7f531d177647E07163c9c756","to":"0x675828c833A33C6f808AdCC6e08E397C8DA855aC","gas":"4465034","gasPrice":"4000000005","gasUsed":"4465034","status":"0","value":"0","input":"0x","nonce":"18501","timestamp":"1510812409","confirmations":7,"extra":""}'
    const tx = JSON.parse(txStr)        
    Log.log(tx)
    const block = {
        number:2080176,
        hash:"0x49f1fe9b41390b6c1dbfaac4531659a5f49d2f76611be401b6f14ba3d33c5b70",
        timestamp:"1510812489"
    }
    await onNewTransaction(tx, block);
}
parseArgs()
start();
//testTx();
