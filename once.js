"use strict"

require("./lambda").handle(require("./event"), null, (err, data) => {
    if (err) {
        console.error(err);
    } else {
        console.log(data);
    }
});
