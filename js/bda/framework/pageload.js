/**
 * Copyright 2014 General Dynamics Information Technology.
 */

(function() {
    "use strict";

    var bucket = window.location.href;
    var pos = bucket.lastIndexOf('/');
    if (pos > 0 && pos < (bucket.length - 1)) {
        bucket = bucket.substring(pos + 1);
    }

    window.pageload = {
        bucket : bucket,
        declare : function() {
        },
        highlight : function() {
        },
        registered : [],
        finishedLoading : function() {
            var loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator.style.display = 'none';
        }
    };

    if (window.location.protocol === 'file:') {
        if (window.confirm("You must host this app on a web server.\nSee contributor's guide for more info?")) {
            window.location = 'https://github.com/AnalyticalGraphicsInc/cesium/wiki/Contributor%27s-Guide';
        }
    }
}());
