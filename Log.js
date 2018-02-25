var DEBUG=true

exports.log = function(text, ext) {
    if (DEBUG) {
        if (ext) {
            console.log(text, ext)
        } else {
            console.log(text)
        }
    }
}
