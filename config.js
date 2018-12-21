var path = require('path')
const parentDir = path.resolve(__dirname, '..')
var configList = {
    dev: {
        db: {
            host: 'localhost',
            user: 'test',
            password: 'yiya',
            database: 'ethdb'
        },
        gethipc: parentDir + "/geth/data/00/geth.ipc"
    },
    test: {
        db: {
            host: 'localhost',
            user: 'test',
            password: 'yiya',
            database: 'ethdb_test'
        },
        sqlMrgFile:"/data/d01/mysql/ethdb_test/ethtx.MRG",
        gethipc: parentDir + "/geth/data/00/geth.ipc"
    },
    infura: {
        db: {
            host: 'localhost',
            user: 'test',
            password: 'yiya',
            database: 'ethdb_infura'
        },
        sqlMrgFile:"/data/d01/mysql/ethdb_ropsten/ethtx.MRG",
        gethipc: "wss://ropsten.infura.io/ws/v3/XXXXXXXX",
    },
    ropsten: {
        db: {
            host: 'ropsten.yiya.io',
            user: 'test',
            password: 'yiya',
            database: 'ethdb_ropsten'
        },
        sqlMrgFile:"/data/d01/mysql/ethdb_ropsten/ethtx.MRG",
        gethipc: parentDir + "/parity/data/ropsten/jsonrpc.ipc"
    },
    mainnet: {
        db: {
            host: 'localhost',
            user: 'test',
            password: 'yiya',
            database: 'ethdb_mainnet'
        },
        sqlMrgFile:"/home/shenjianjing/data/disk3/mysql/ethdb_mainnet/ethtx.MRG",
        gethipc: parentDir + "/parity/mainnet/jsonrpc.ipc"
    },
    release: {
        db: {
            host: 'localhost',
            user: 'test',
            password: 'yiya',
            database: 'ethdb'
        },
        sqlMrgFile:"/data/d01/mysql/ethdb/ethtx.MRG",
        //gethipc: parentDir + "/geth/mainnet/geth.ipc"
        gethipc: parentDir + "/parity/mainnet/jsonrpc.ipc"
    },
}

const env = process.env.YIYA_CONFIG_NAME || 'release';
module.exports = {...configList[env]};
