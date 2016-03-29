/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

/**
 * Angular service for distance tool.
 */
bdaSpatialApp.service('distanceService', function() {
            
    this.distance = 0;
    this.distanceM = 0;        
    this.heading = 90;
    this.units = [
        { 'label': 'km', 'conversion': 1000},
        { 'label': 'nm', 'conversion': 1852}, 
        { 'label': 'kyds', 'conversion': 914.5},
        { 'label': 'mi', 'conversion': 1609.34},
        { 'label': 'm', 'conversion': 1}];

    this.unit = this.units[0];
    
    this.toggleClear = false;
    
    /**
     * Sets the meter distance variable and converts the distance to units and
     * sets the distance variable.
     * @param {number} distanceM  distance in meters
     */
    this.setDistance = function(distanceM) {
        this.distanceM = distanceM;
        this.updateDistance();
    };
    
    /**
     * Sets the heading variable.
     * @param {number} heading
     */
    this.setHeading = function(heading) {
        if (heading < 0) {
            heading += 360;
        }
        
        this.heading = heading.toFixed(2);
    };
    
    /**
     * Converts the distance value to selected units and updates the distance
     * variable.
     */
    this.updateDistance = function() {
        this.distance = (this.distanceM / this.unit.conversion).toFixed(2);        
    };
 });