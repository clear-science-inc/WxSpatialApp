/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
      
], function() {
   "use strict";
    
    /**
     * Define units from wxxm Units.xsd. 
     */
    var Units = {};
    
    /**
     * @static  
     */
    Units.UNITS = {
        // UomTemperatureType
        KELVIN:     {abbr: "K", factor: 0},
        CELSIUS:    {abbr: "C", factor: 0},
        FAHRENHEIT: {abbr: "F", factor:0},
        
        // Distance: UomHorizontalDistanceType, UomVerticalDistance,TypeUomDepthType
        MILE:       {abbr: "SM", factor: 1609.344},
        NAUTICAL_MILE: {abbr: "NM", factor: 1852},
        METER:      {abbr: "m", factor: 1.0},       // base unit
        FOOT:       {abbr: "ft", factor: 0.3048},
        KILOMETER:  {abbr: "km", factor: 1000},
        FLIGHT_LEVEL: {abbr: "FL", factor: 0},
        MILLIMETER: {abbr: "mm", factor: 0.001},
        CENTIMETER: {abbr: "cm", factor: 0.01},
        
        // UomSpeedType
        METERS_PER_SEC: {abbr: "m/s", factor: 1.0},
        MILES_PER_HR: {abbr: "mph", factor: 0.44704},
        KM_PER_HR:  {abbr: "km/h", factor: 0.277777778},
        KNOTS:      {abbr: "kt", factor: 0.514444}        
    };
    
    
   /**
    * Converts the given value in the given unit to destination unit.
    * @param value  the value to be converted
    * @param{Object} sourceUnit  the unit to convert from
    * @param{Object} destUnit   the unit to convert to
    * @return{number} the converted value in the given unit
    */
    Units.convert = function(value, sourceUnit, destUnit) {
       if (sourceUnit == Units.UNITS.KELVIN || sourceUnit == Units.UNITS.CELSIUS || sourceUnit == Units.UNITS.FAHRENHEIT) {
            return Units.convertTemperature(sourceValue, sourceUnit, destUnit);
       }
       else if (sourceUnit == Units.UNITS.FLIGHT_LEVEL) {
            // TODO:
            return value;
       }
       else {
            // Convert source to meters, then to this unit
            return value * sourceUnit.factor / destUnit.factor;
       }
    };

   /**
    * Converts the given temperature in the given unit to destination unit.
    * @param value  the value to be converted
    * @param{Object} sourceUnit  the unit to convert from
    * @param{Object} destUnit   the unit to convert to
    * @return{number} the converted value in the given unit
    */
    Units.convertTemperature = function(value, sourceUnit, destUnit) {
        switch (destUnit) {
            case Units.UNITS.KELVIN:
                if (sourceUnit == Units.UNITS.CELSIUS) {
                    return value - 273.15;
                }
                else {
                    return (value-273.15) * 9/5 + 32;
                }
                break;
            case Units.UNITS.CELSIUS:
                if (sourceUnit == Units.UNITS.FAHRENHEIT) {
                    return (value - 32) * 5/9;
                }
                else {
                    return value + 273.15;
                }
                break;
            case Units.UNITS.FAHRENHEIT:
                if (sourceUnit == Units.UNITS.CELSIUS) {
                    return value * 9/5 + 32;
                }
                else {
                    return (value - 32) * 5/9 + 273.15;
                }
                break;
        }
    };
    
    return Units;
});