/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Cesium/Core/defined'  
], function(defined) {
   "use strict";
    
    var Util = {};
    
    /** @static */ Util.windSpeed = 'windSpeed';
    /** @static */ Util.windDirection = 'windDirection';
    
    /** @static */
    var parameters = {
        verticalVisibility: 'Ceiling',
        horizontalVisibility: 'Visibility',
        windSpeed : 'Wind Speed',
        windDirection : 'Wind Direction',
        airTemperature : 'Temperature',
        dewpointTemperature : 'Dew Point',
        totalCloudCover : 'Total Cloud Cover',
        cloudCondition : 'Cloud Condition',
        seaWx: 'Sea State',
        qfe: 'QFE',
        qnh: 'QNH'
    };
        
    /**
     * Looks up the parameter label for given parameter property name.
     * @param {string} parameter
     * @return {string}
     */
    Util.lookupParameterLabel = function(parameter) {
        return parameters[parameter];
    };
    
    /**
     * Rounds and fixes the number of decimal places displayed.
     * @param {string} n  number to be rounded
     * @param {number} d  number of decimal places
     * @return {number}
     */
    Util.roundAndFix = function(n, d) {
    	var number = parseFloat(n);
    	if (defined(number)) {
	        var m = Math.pow (10, d);
	        return Math.round (number * m) / m;
    	}
    	
    	return n;
    };
    
    /**
     * Converts an area of interest string into an aoi object.
     * @param {string} aoiString  delimited by commas representing south, east, north, west
     * @return {{north: number, west: number, east: number, south: number}} aoi 
     */
    Util.makeAoi = function(aoiString) {
        var nums = aoiString.split(',');
        return { 
                west: parseFloat(nums[0]), 
                south: parseFloat(nums[1]), 
                east: parseFloat(nums[2]), 
                north: parseFloat(nums[3])};     
    };
    
    /**
     * Creates a position object given latitude and longitude.
     * @param {number} latitude 
     * @param {number} longitude 
     * @return {{latitude: number, longitude: number}}
     */
    Util.makePosition = function(latitude, longitude) {
        return { latitude : latitude, longitude: longitude };
    };
    
    /**
     * Adds 2 javascript numbers, accounts for negative numbers which javascript's
     * in line addition would return a concatenated string of the 2 numbers. 
     * @param {number} num1
     * @param {number} num2
     * @return {number} the sum of the 2 numbers
     */
    Util.addjs = function(num1, num2) {
        var newNum1 = Math.abs(num1);
        var newNum2 = Math.abs(num2);
        var mult1 = num1 / newNum1;
        var mult2 = num2 / newNum2;
        
        var result = (newNum1 * mult1) + (newNum2 * mult2);
        
        return result;
    };
    
    /**
     * Clones a simple object by using json parser to create new object. 
     * @param {Object} simpleObj
     * @return {Object}
     */
    Util.cloneSimpleObj = function(simpleObj) {
        return JSON.parse(JSON.stringify(simpleObj));
    };
    
    /**
     * Creates a checksum out of a String.
     * @param {string} s
     * @return {number}
     */
    Util.checksum = function(string) {
      var chk = 0x12345678;
    
      for (var i=0; i<string.length; i++) {
        chk += (string.charCodeAt(i) * (i + 1));
      }
    
      return chk;
    };
    
    /**
     * Purges a DOM element of all its attributes and children including
     * listeners. The purge function should be called before removing any 
     * element, either by the removeChild method, 
     * or by setting the innerHTML property.
     * 
     * Credit: Doug Crockford http://javascript.crockford.com/memory/leak.html
      * 
     * @param {Object} d
     */
    Util.purge = function(d) {
        var a = d.attributes, i, l, n;
        if (a) {
            for (i = a.length - 1; i >= 0; i -= 1) {
                n = a[i].name;
                if (typeof d[n] === 'function') {
                    d[n] = null;
                }
            }
        }
        a = d.childNodes;
        if (a) {
            l = a.length;
            for (i = 0; i < l; i += 1) {
                Util.purge(d.childNodes[i]);
            }
        }
    };
        
    return Util;
});