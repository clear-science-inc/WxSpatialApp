/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Cesium/Core/defined',
    'Cesium/Core/defineProperties',
    'Cesium/Core/Event',
],function(
    defined,
    defineProperties,
    Event
) {
    "use strict";
    
    /**
     * @constructor 
     * @param {string} units
     * @param {string|ObsProperty} value
     * @param {string} color
     */
    var ObsProperty = function(units, value, color) {
        this._units = units;
        this._value = value;
        this._color = color;
        this._propertyChanged = new Event();
    };

    defineProperties(ObsProperty.prototype, {
        units : {
            /**
             * Gets the units.
             * @return {string}
             */
            get : function() {
                return this._units;
            },
            
            /**
             * Sets the units. 
             * @param {string} units
             */
            set : function(units) {
                this._units = units;
            }
        },
        
        value : {
            /**
             * Gets the value. 
             * @return {string|ObsProperty} value
             */
            get : function() {
                return this._value;
            },
            
            /**
             * Sets the value. 
             * @param {string|ObsProperty} value
             */
            set : function(value) {
                this._value = value;
            }            
        },
        
        color : {
            /**
             * Gets the color.
             * @return {string} 
             */
            get : function() {
                return this._color;
            },
            
            /**
             * Sets the color.
             * @param {string} color 
             */
            set : function(color) {
                this._color = color;
            }
        },
        
        propertyChanged : {
            /**
             * Gets the propertyChanged event.
             * @return {Event} 
             */
            get : function() {
                return this._propertyChanged;
            }
        },

    });
    
    /**
     * Gets the value out of the obs property.
     * @return {string}
     */
    ObsProperty.prototype.getValueString = function () {
        return getValue(this._value);
        
        /**
         * Gets the value out of obs property. 
         * @param {string|ObsProperty} value
         */
        function getValue(value) {
            var rValue = '';
            
            try {
                if (typeof value == 'string') {
                    rValue = parseFloat(value);
                    if (isNaN(rValue)) {
                        rValue = value;                        
                    }
                }
                else {  // in nested property
                    for (var name in value) {
                        var nValue = getValue(value[name].value);
                        if (defined(nValue)) {
                            rValue += (rValue.length > 0) ? ' ' : '';
                            rValue += nValue;
                        }
                    }
                }
            } catch (ex) {
                console.error("Error extracting value from ObsProperty: " + ex);
            }
            return rValue;
        }
    };

    return ObsProperty;
});