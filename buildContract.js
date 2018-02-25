var Log = require('./Log');
var process = require('process');
var DbHelper = require('./dbhelper');
var START_BLOCK_NUM = 0;
var END_BLOCK_NUM = null;

const TRANSACTION_TYPE_DEFAULT  = 0;
const TRANSACTION_TYPE_CONTRACT = 1;

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

async function parseContract(tx) {
    // let token = await _getToken(tx.to);
    let isContract = false
    let to2 = null;
    let extra = null;
    if (tx.to) {
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

async function parseContractTransaction(tx, commit=false) {
    tx = await parseContract(tx)
    if (tx.type != TRANSACTION_TYPE_CONTRACT) {
        return false;
    }
    let sql = "update ethtx set ? where id=" + tx.id;
    try {
        await DbHelper.executeSql(sql, tx, commit);
        return true;
    } catch (error) {
        Log.log("update transaction contract ", error);
    }
}

async function buildContractTransaction() {
    let curId = 0;
    while (true) {
        try {
            let results;
            if (END_BLOCK_NUM) {
                results = await DbHelper.executeSql("select * from ethtx where id >" + curId + " and type=0 and blockNumber >" + START_BLOCK_NUM + " and blockNumber <" + END_BLOCK_NUM + " limit 500");
            } else {
                results = await DbHelper.executeSql("select * from ethtx where id >" + curId + " and type=0 and blockNumber >" + START_BLOCK_NUM + " limit 500");
            }
            if (!results || results.length <= 0) {
                break;
            }
            Log.log("data count:" + results.length)
            Log.log("first blockNumber:" + results[0].blockNumber)
            let builtCount = 0;
            for (let item of results) {
                let result = await parseContractTransaction(item);
                if (result) {
                    builtCount++;
                }
                if (curId < item.id) {
                    curId = item.id;
                }
            }
            await DbHelper.commit();
            Log.log("built contract " + builtCount)
        } catch (error) {
            Log.log("updateTrasactionStatus error", error);
        }
    }
}

async function start() {
    await DbHelper.init();
    await buildContractTransaction();
}

function parseArgs() {
    var program = require('commander');

    program
      .version('0.1.0')
      .option('-s, --start <string>', 'start block')
      .option('-e, --end <string>', 'end block')
      .parse(process.argv);


    if(program.start) {
         START_BLOCK_NUM = parseInt(program.start);
    }
    if(program.end) {
         END_BLOCK_NUM = parseInt(program.end);
    }
    Log.log("start=" + START_BLOCK_NUM + ",end=" + END_BLOCK_NUM);
}

parseArgs()
start();
//testTx();
