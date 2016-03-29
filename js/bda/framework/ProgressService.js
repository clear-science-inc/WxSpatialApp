/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

bdaSpatialApp.service('progressService', function() {
    
    this.showProgressBar = false;
    this.statusMessage = '';
    
    /**
     * Shows indeterminate status bar with specified status message. 
     * @param {string} message
     */
    this.showProgress = function(message) {
        this.statusMessage = message;
        this.showProgressBar = true;
    };

});