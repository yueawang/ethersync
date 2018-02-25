var mysql = require('promise-mysql');
var Log = require('./Log');
var Config = require('./config');

var connection;
exports.init = async function() {
    try {
        Log.log("connect mysql begin");
        connection = await mysql.createConnection(Config.db);
        Log.log("connect mysql end");
    } catch (error) {
        Log.log("connect mysql error:" + error);
    }
}

exports.executeSql = async function(sql, params=null, commit=false) {
    if (connection == null) {
        Log.log("Connection is null");
        return;
    }
    try {
        const rows = await connection.query(sql, params);
        if (commit) {
            await connection.commit();
        }
        return rows;
    } catch (error) {
        Log.log(error);
    }
}

exports.commit = async function() {
    if (connection == null) {
        Log.log("Connection is null");
        return;
    }
    try {
        await connection.commit();
    } catch (error) {
        Log.log(error);
    }
}