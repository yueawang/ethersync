var Log = require('./Log');
var JPush = require("./lib/JPush/JPush.js");
var client = JPush.buildClient("xxxxxxxxx", "xxxxxxxxx");

// client.push().setNotification('Hi, JPush') // 设置全局的 alert。
//
// // 设置特定平台 notification。
// client.push().setNotification(
//     JPush.android('Hi,JPush', 'JPush Title', 1, {'key':'value'}),
//     JPush.ios('Hi, JPush', 'sound', 1))
//
// // 同时设置全局 alert 与特定平台 notification。
// client.push().setNotification('Hi, JPush',
//     JPush.android('Hi,JPush', 'JPush Title', 1, {'key':'value'}),
//     JPush.ios('Hi, JPush', 'sound', 1))

// client.push().setPlatform(JPush.ALL)
//     .setAudience(JPush.tag('tag1', 'tag2'), JPush.alias('alias1', 'alias2'))
exports.pushNotification = function(alias, title="", message="", extras=null) {
    var obj = client.push().setPlatform(JPush.ALL)
        .setNotification(JPush.android(message, title, 1, extras), JPush.ios(message, "sound", 1, true, extras))
    if (alias) {
        obj = obj.setAudience(JPush.alias(alias))
    } else {
        obj = obj.setAudience(JPush.ALL)
    }
    obj.send(function (err, res) {
        if (err) {
            Log.log(err.message);
        } else {
            Log.log('Sendno: ' + res.sendno);
            Log.log('Msg_id: ' + res.msg_id);
        }
    });
}

exports.pushMessage = function(alias, title="", message="", extras=null) {
    var obj = client.push().setPlatform(JPush.ALL)
            .setMessage(message, title, "", extras)
    if (alias) {
        obj.setAudience(JPush.alias(alias))
    } else {
        obj = obj.setAudience(JPush.ALL)
    }
    obj.send(function (err, res) {
        if (err) {
            Log.log(err.message);
        } else {
            Log.log('Sendno: ' + res.sendno);
            Log.log('Msg_id: ' + res.msg_id);
        }
    });
}
