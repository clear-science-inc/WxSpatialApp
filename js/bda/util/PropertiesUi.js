/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Bda/util/Util',
    'Cesium/Core/defined'
], function(Util, defined) {
   "use strict";

    /** @static */ var WIND_DIRS = [
        {min:0,     max:22.5,  display: 'N'},
        {min:22.5,  max:67.5,  display: 'NE'},
        {min:67.5,  max:112.5, display: 'E'},
        {min:112.5, max:157.5, display: 'SE'},
        {min:157.5, max:202.5, display: 'S'},
        {min:202.5, max:247.5, display: 'SW'},
        {min:247.5, max:292.5, display: 'W'},
        {min:292.5, max:337.5, display: 'NW'},
        {min:337.5, max:360,   display: 'N'}
    ];

    /**
     * Creates a Properties UI.
     * @constructor
     * @param {Object} properties
     */
    function PropertiesUi(properties) {
        // Add properties
        this._properties = {};
        this._div = document.createElement('div');
        this._table = document.createElement('table');
        this._table.classList.add('bda-metoc-table');
        this._div.appendChild(this._table);
        this.addProperties(properties);
    }

    /**
     * Returns true if the parent DOM node is showing.
     */
    PropertiesUi.prototype.isShowing = function() {
        return !this._div.parentNode.hidden;
    };

    /**
     * Returns the parent DOM node.
     */
    PropertiesUi.prototype.getParent = function() {
        return this._div.parentNode;
    };

    /**
     * Gets time line availability.
     * @return {TimeIntervalCollection} availability
     */
    PropertiesUi.prototype.getAvailability = function() {
        return this._availability;
    };

    /**
     * Sets the time line availability.
     * @param {TimeIntervalCollection} availability
     */
    PropertiesUi.prototype.setAvailability = function(availability) {
        this._availability = availability;
    };

    /**
     * Toggles the 'selected' class in the parents DOM node.
     */
    PropertiesUi.prototype.toggleSelected = function() {
        this._div.parentNode.classList.toggle('selected');
    };

    /**
     * Sets properties to be displayed in pane.
     * @param {Object} properties
     */
    PropertiesUi.prototype.setProperties = function(properties) {
        // Delete old properties from table
        var oldProperties = this._table.getElementsByTagName('tr');
        for (var i=oldProperties.length-1; i>=0; i--) {
            // Remove property listener
           try {
                var property = this._properties[oldProperties[i].id];
                if (defined(property)) {
                    property.propertyChanged.removeEventListener(this.onColorChangedEventListener, oldProperties[i]);
                }
            } catch (e ){
                //console.error("got error removing listener: " + oldProperties[i].id + " ERROR: "+ e);
            }

            // Remove property from table
            this._table.removeChild(oldProperties[i]);
        }

        // Add new properties
        this._properties = {};
        this.addProperties(properties);
    };

    /**
     * Adds properties to be displayed in pane.
     * @param {Object} properties
     */
    PropertiesUi.prototype.addProperties = function(properties) {
        var propertyTypes = Object.getOwnPropertyNames(properties);

        // Make Observation time the first item in the list
        if (properties.observationtime) {
            var timeObservationTime = properties.observationtime;

            var row = document.createElement('tr');
            var col1 = document.createElement("td");
            var col2 = document.createElement("td");
            var col1Text = document.createTextNode("Time:");
            var col2Text = document.createTextNode(getPropertyValue(timeObservationTime, "observationtime"));
            col1.appendChild(col1Text);
            col2.appendChild(col2Text);
            row.appendChild(col1);
            row.appendChild(col2);
            row.id = 'observationtime';

            if (defined(timeObservationTime.color)) {
                row.style.color = timeObservationTime.color;
            }

            timeObservationTime.propertyChanged.addEventListener(this.onColorChangedEventListener, row);

            this._table.appendChild(row);

            // Remove observation_time from propertyTypes
            propertyTypes.splice(propertyTypes.indexOf("observationtime"), 1);
        }

        // Make air temperature the second item in the list
        if (properties.airTemperature) {
            var airTemperature = properties.airTemperature;

            var row = document.createElement('tr');
            var col1 = document.createElement("td");
            var col2 = document.createElement("td");
            var col1Text = document.createTextNode("Temperature:");
            var col2Text = document.createTextNode(getPropertyValue(airTemperature, "airTemperature"));
            col1.appendChild(col1Text);
            col2.appendChild(col2Text);
            row.appendChild(col1);
            row.appendChild(col2);
            row.id = 'airTemperature';

            if (defined(airTemperature.color)) {
                row.style.color = airTemperature.color;
            }

            airTemperature.propertyChanged.addEventListener(this.onColorChangedEventListener, row);

            this._table.appendChild(row);

            // Remove air Temperature from propertyTypes
            propertyTypes.splice(propertyTypes.indexOf("airTemperature"), 1);
        }

        // Make dewpointTemperature the third item in the list
        if (properties.dewpointTemperature) {
            var dewpointTemperature = properties.dewpointTemperature;

            var row = document.createElement('tr');
            var col1 = document.createElement("td");
            var col2 = document.createElement("td");
            var col1Text = document.createTextNode("Dewpoint:");
            var col2Text = document.createTextNode(getPropertyValue(dewpointTemperature, "dewpointTemperature"));
            col1.appendChild(col1Text);
            col2.appendChild(col2Text);
            row.appendChild(col1);
            row.appendChild(col2);
            row.id = 'dewpointTemperature';

            if (defined(dewpointTemperature.color)) {
                row.style.color = dewpointTemperature.color;
            }

            dewpointTemperature.propertyChanged.addEventListener(this.onColorChangedEventListener, row);

            this._table.appendChild(row);

            // Remove dewpointTemperature from propertyTypes
            propertyTypes.splice(propertyTypes.indexOf("dewpointTemperature"), 1);
        }

        // Make altim_in_hg the fourth item in the list
        if (properties.altimeter) {
            var altim_in_hg = properties.altimeter;

            var row = document.createElement('tr');
            var col1 = document.createElement("td");
            var col2 = document.createElement("td");
            var col1Text = document.createTextNode("Altimeter:");
            var col2Text = document.createTextNode(getPropertyValue(altim_in_hg, "altimeter"));
            col1.appendChild(col1Text);
            col2.appendChild(col2Text);
            row.appendChild(col1);
            row.appendChild(col2);
            row.id = 'altimeter';

            if (defined(altim_in_hg.color)) {
                row.style.color = altim_in_hg.color;
            }

            altim_in_hg.propertyChanged.addEventListener(this.onColorChangedEventListener, row);

            this._table.appendChild(row);

            // Remove altim_in_hg from propertyTypes
            propertyTypes.splice(propertyTypes.indexOf("altimeter"), 1);
        }

        // Make horizontal Visibility the fifth item in the list
        if (properties.horizontalVisibility) {
            var horizontalVisibility = properties.horizontalVisibility;

            var row = document.createElement('tr');
            var col1 = document.createElement("td");
            var col2 = document.createElement("td");
            var col1Text = document.createTextNode("Visibility:");
            var col2Text = document.createTextNode(getPropertyValue(horizontalVisibility, "horizontalVisibility"));
            col1.appendChild(col1Text);
            col2.appendChild(col2Text);
            row.appendChild(col1);
            row.appendChild(col2);
            row.id = 'horizontalVisibility';

            if (defined(horizontalVisibility.color)) {
                row.style.color = horizontalVisibility.color;
            }

            horizontalVisibility.propertyChanged.addEventListener(this.onColorChangedEventListener, row);

            this._table.appendChild(row);

            // Remove horizontal Visibility from propertyTypes
            propertyTypes.splice(propertyTypes.indexOf("horizontalVisibility"), 1);
        }

        // Make sky condition the sixth item in the list
        if (properties.skycondition) {
            var skyCondition = properties.skycondition;

            var row = document.createElement('tr');
            var col1 = document.createElement("td");
            var col2 = document.createElement("td");
            var col1Text = document.createTextNode("Cloud Cover:");
            var col2Text = document.createTextNode(getPropertyValue(skyCondition, "skycondition"));
            col1.appendChild(col1Text);
            col2.appendChild(col2Text);
            row.appendChild(col1);
            row.appendChild(col2);
            row.id = 'skycondition';

            if (defined(skyCondition.color)) {
                row.style.color = skyCondition.color;
            }

            skyCondition.propertyChanged.addEventListener(this.onColorChangedEventListener, row);

            this._table.appendChild(row);

            // Remove observation_time from propertyTypes
            propertyTypes.splice(propertyTypes.indexOf("skycondition"), 1);
        }

        // If have both wind speed and direction then combine them to display
        // a single property  - wind
        if (properties.windSpeed && properties.windDirection) {
            var speedProperty = properties.windSpeed;
            var directionProperty = properties.windDirection;

            var row = document.createElement('tr');
            var col1 = document.createElement("td");
            var col2 = document.createElement("td");
            var col1Text = document.createTextNode("Wind:");
            var col2Text = document.createTextNode(getPropertyValue(speedProperty, Util.windSpeed)
                + getPropertyValue(directionProperty, Util.windDirection));
            col1.appendChild(col1Text);
            col2.appendChild(col2Text);
            row.appendChild(col1);
            row.appendChild(col2);
            row.id = 'wind';

            if (defined(speedProperty.color)) {
                row.style.color = speedProperty.color;
            }

            speedProperty.propertyChanged.addEventListener(this.onColorChangedEventListener, row);

            this._table.appendChild(row);

            // Remove windDirection and windSpeed from propertyTypes
            propertyTypes.splice(propertyTypes.indexOf(Util.windSpeed), 1);
            propertyTypes.splice(propertyTypes.indexOf(Util.windDirection), 1);
        }

        // Make Observation time the 8th item in the list
        if (properties.flightcategory) {
            var flightCategory = properties.flightcategory;

            var row = document.createElement('tr');
            var col1 = document.createElement("td");
            var col2 = document.createElement("td");
            var col1Text = document.createTextNode("Flight Catagory:");
            var col2Text = document.createTextNode(getPropertyValue(flightCategory, "flightcategory"));
            col1.appendChild(col1Text);
            col2.appendChild(col2Text);
            row.appendChild(col1);
            row.appendChild(col2);
            row.id = 'flightcategory';

            if (defined(flightCategory.color)) {
                row.style.color = flightCategory.color;
            }

            flightCategory.propertyChanged.addEventListener(this.onColorChangedEventListener, row);

            this._table.appendChild(row);

            // Remove flight category  from propertyTypes
            propertyTypes.splice(propertyTypes.indexOf("flightcategory"), 1);
        }

        //
        // Remove items we do not want to display
        //
        if (properties.quality_control_flags) {
            propertyTypes.splice(propertyTypes.indexOf("quality_control_flags"), 1);
        }

        if (properties.elevation_m) {
            propertyTypes.splice(propertyTypes.indexOf("Elevation"), 1);
        }

        if (properties.metar_type) {
            // Remove windDirection and windSpeed from propertyTypes
            propertyTypes.splice(propertyTypes.indexOf("metar_type"), 1);
        }

        for (var i=0; i<propertyTypes.length; i++) {
            var obsProperty = properties[propertyTypes[i]];
            var propertyName = Util.lookupParameterLabel(propertyTypes[i]);
            propertyName = (defined(propertyName) ? propertyName : propertyTypes[i]) + ":";
            var propertyValue = getPropertyValue(obsProperty, propertyTypes[i]);
            if (obsProperty.units != undefined) {
                propertyValue = propertyValue  + " " + obsProperty.units;
            }

            var row = document.createElement('tr');
            var col1 = document.createElement("td");
            var col2 = document.createElement("td");
			if ((propertyName == "icaocode:") || (propertyName == "stationid:")) {
                var col1Text = document.createTextNode("Station ID:");
			} else if (propertyName == "wxstring:") {
                var col1Text = document.createTextNode("Weather:");
			} else {
                var col1Text = document.createTextNode(propertyName);
			}
            var col2Text = document.createTextNode(propertyValue);
            col1.appendChild(col1Text);
            col2.appendChild(col2Text);
            row.appendChild(col1);
            row.appendChild(col2);
            row.id = propertyTypes[i];

            if (defined(obsProperty.color)) {
                row.style.color = obsProperty.color;
            }

            obsProperty.propertyChanged.addEventListener(this.onColorChangedEventListener, row);

            this._table.appendChild(row);
        }

        for (var property in properties) {
            // TODO: should we check for duplicate property names?? how should we handle them??
            //       this will probably be the case when their different types of objects at station ID
            this._properties[property] = properties[property];
        }

        /**
         * Gets the property value from obsProperty.
         * Any special processing base on propertyName is done here.
         * (i.e. Wind Direction).
         * @param {ObsProperty} obsProperty
         * @param {String} propertyType
         * @return String
         */
        function getPropertyValue(obsProperty, propertyType) {
            var property = '';
            var obsValue = obsProperty.getValueString();

            if (propertyType == Util.windDirection) {
                property = getWindDirString(obsProperty);
            }
            else if ((propertyType == 'raw_text') || (propertyType == 'icao_code') ||
                    (propertyType == 'quality_control_flags') ||
                    (propertyType == 'wx_string') || (propertyType == 'sky_condition') ||
                    (propertyType == 'flight_category') || (propertyType == 'metar_type') ||
                    (propertyType == 'observation_time') || (propertyType == 'sky_condition') ||
                    (propertyType == 'Issue Time') || (propertyType == 'Bulletin Time') ||
                    (propertyType == 'Valid From') || (propertyType == 'Valid To') ||
					(propertyType == 'Time') || (propertyType == 'observationtime')) {
                	return obsProperty._value;
            }
            else {
                // clean up any numbers in property
                var parts = [obsValue];
                if (typeof obsValue == 'string') {
                    parts = obsValue.split(' ');
                }

                for (var i=0; i<parts.length; i++) {
                    property += (property.length > 0) ?' ' : '';
                    if (!isNaN(parseFloat(parts[i]))) {
                        property += Util.roundAndFix(parts[i], 1);
                    }
                    else {
                        property += parts[i];
                    }
                }
            }

            return property;
        }


        /**
         * Gets the wind direction string (N, NE, E, SE, S, SW, W, NW).
         * @param {ObsProperty} obsProperty
         * @return String
         */
        function getWindDirString(obsProperty) {
            var value = obsProperty.value;
            var windDir;

            if (value >= 360) {
                value %= 360;
            }

            for (var i=0; i<WIND_DIRS.length; i++) {
                if (value < WIND_DIRS[i].max) {
                    windDir = WIND_DIRS[i].display;
                    break;
                }
            }

            return windDir;
        }
    };

    /**
     * Updates the properties color when the color event is triggered.
     * @param {Object} property
     * @param {string} propertyName
     * @param {string} newColor
     * @param {string} oldColor
     */
    PropertiesUi.prototype.onColorChangedEventListener = function(property, propertyName, newColor, oldColor) {
        this.style.color = newColor;
    };

    /**
     * Destroys this object.
     */
    PropertiesUi.prototype.destroy = function() {
        this.setProperties({});
        return null;
    };

    return PropertiesUi;
});
