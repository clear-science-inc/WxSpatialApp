/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

bdaSpatialApp.service('alertService', function() {
    
    this.messageHandler;
    this.selectionHandler;
    
    this.showMessage = function(message) {
        if (this.messageHandler !== undefined) {
            this.messageHandler(message);
        }
    };
    
    this.fireSelection = function() {
        if (this.selectionHandler !== undefined) {
            this.selectionHandler();
        }
    };
});