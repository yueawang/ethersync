var Log = require('./Log');
var JPushUtils = require('./jpushutils');
var extras = {
    has:0x000,
};
var params = process.argv.splice(2);
console.log("args", params);
const data = {
msgType:"newtransaction",
unit:"ether",
decimal:18,
nonce: 108,
hash: '0x23dba1e31810ce78b11eac5272d7b961325865c1552f270f5509128a4779b2b9',
blockHash: '0x229990dd1bcb007141b6c60ddfc191843e3c3d3aa0b3872e96e23f604a5be95a',
from: '0x81Bc96f4469B73aACBC215f7E14366848Ab0F52F',
transactionIndex: 0,
gas: 21000,
value: '12000000000000000',
blockNumber: 361,
to: '0x63d956719a74b5353017e9CE636928683388c9D2',
s: '0x1cbc9e21619e9b0a5d957901437c47e1c8f2ac5e2903415807f40ac6a8d946c0',
r: '0xd3d96ace31d3e9bafee1035b3d6ceee4264d0b90f4a5f776226ee3ad8df2230d',
v: '0x42',
input: '0x',
extra:'',
gasPrice: '60000000000' }	
//JPushUtils.pushMessage("5c49c133a47fffe4", "新通知", "通知内容", data)
JPushUtils.pushMessage(params[0], "新通知", "通知内容", data)
//JPushUtils.pushMessage("9ac24d922b8c31e", "新通知", "通知内容", data)
//JPushUtils.pushMessage("23c06f2b090c6db", "新通知", "通知内容", data)
//JPushUtils.pushMessage("a653e99d0c77281f", "新通知", "通知内容", data)
//JPushUtils.pushMessage("3cbdc28f2d81d84ad201e3d0e953ffa91ee66095", "新消息", "消息内容", extras);
// JPushUtils.pushNotification("testalias");
