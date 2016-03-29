/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

/**
 * Angular utility service. 
 */
bdaSpatialApp.service('utilService', function() {
    
    /**
     * Finds the index of an equivalent object in an array.
     * @param {Array} array 
     * @param {Object} object
     * @return {number} returns -1 if not found
     */
    this.indexOfEqualElement = function(array, element) {
        var index = -1;
        for (var i=0; i<array.length; i++) {
            if (this.isEquivalent(array[i], element)) {
                index = i;
                break;
            }
        }
        
        return index;
    };
        
    /**
     * Checks if 2 elements are equivalent by comparing their properties. 
     *
     * @author: http://designpepper.com/blog/drips/object-equality-in-javascript.html
     * 
     * @param {Object} a
     * @param {Object} b
     * @return {boolean}
     */
    this.isEquivalent = function(a, b) {
        // Create arrays of property names
        var aProps = Object.getOwnPropertyNames(a);
        var bProps = Object.getOwnPropertyNames(b);
    
        // If number of properties is different,
        // objects are not equivalent
        if (aProps.length != bProps.length) {
            return false;
        }
    
        for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];
    
            // If values of same property are not equal,
            // objects are not equivalent
            if (a[propName] !== b[propName]) {
                return false;
            }
        }
    
        // If we made it this far, objects
        // are considered equivalent
        return true;
    };
    
    /**
     * Finds the index of the first object with matching properties of an
     * from the array.
     * @param {Array} array 
     * @param {Object} element
     * @param {Array} properties
     * @return {number} returns -1 if not found
     */
    this.indexOfElementWithMatchingProperties = function(array, element, properties) {
        var index = -1;
        for (var i=0; i<array.length; i++) {
            if (this.isMatching(array[i], element, properties)) {
                index = i;
                break;
            }
        }
        
        return index;
    };
        
    /**
     * Checks if 2 elements have the inputted properties. 
     * @param {Object} a
     * @param {Object} b
     * @return {boolean}
     */
    this.isMatching = function(a, b, properties) {
    
        for (var i=0; i<properties.length; i++) {
            var propName = properties[i];
    
            if (!a[propName] || !b[propName]) {
                return false;
            }
            
            // If values of same property are not equal,
            // objects are not equivalent
            if (a[propName] !== b[propName]) {
                return false;
            }
        }
    
        // If we made it this far, objects
        // are considered equivalent
        return true;
    };
    
    /**
     * Creates a unique Id.
     * Credit Andrea Turri http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
     */
    this.createId = function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b;};

     
    /**
     * Checks if variable is defined or not. 
     * @param {Object} value
     */
    this.defined = function(value) {
        return value !== undefined;
    };

});
    
        
