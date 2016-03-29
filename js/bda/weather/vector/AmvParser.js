/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
        'Bda/util/Units',
        'Cesium/Core/Color',
        'Cesium/Core/createGuid',
        'Cesium/Core/JulianDate',
        'Cesium/Core/Math' , 
        'Cesium/Core/TimeInterval',
        'Cesium/Core/TimeIntervalCollection',
        'Cesium/Core/RuntimeError',
        'Cesium/Core/TimeConstants',
        'Cesium/DataSources/Entity',
        'Cesium/DataSources/EntityCollection'
    ], function(
        Units,
        Color,
        createGuid,
        JulianDate,
        CesiumMath,
        TimeInterval,
        TimeIntervalCollection,
        RuntimeError,
        TimeConstants,
        Entity,
        EntityCollection) {
    "use strict";
    
    var AmvParser = {};
    
    /**
     * Parses the AMV ASCII file into the dataSource. Parsing is based on the
     * defined {@link http://tropic.ssec.wisc.edu/archive/data/samples/windsqi.readme.txt}
     * @param {ObsDataSource} dataSource
     * @param {String} AMV ASCII data to be parsed
     * @param {function} crsFunction
     */
    AmvParser.parseAsciiData = function(dataSource, bigString, windType, level, crsFunction) {
        var lines = bigString.split('\n');
        
        if (lines && lines.length > 1) {
            parseLines(dataSource, lines, windType, level, crsFunction);
        }
        else {
            throw new RuntimeError('Invalid AMV file');
        }       
    };
    
    /**
     * Parses a line of AMV observation data.
     * @param {ObsDataSource} dataSource
     * @param {String[]} lines
     */
    function parseLines(dataSource, lines, windType, level, crsFunction) {
        // skip first line, its the header
        for (var i=1, len=lines.length; i<len; i++) {
            parseLine(dataSource, lines[i], windType, level, crsFunction);
        }
        
        computeStopTime(dataSource);
        
        /**
         * Computes the stop time of each object based on next object of same 
         * station id. 
         * @param {ObsDataSource} dataSource
         * 
         * Modified Works
         */
        function computeStopTime(dataSource) {
            try {
                var obs = dataSource.entities.values;
                obs.sort(compareObs);
                
                for (var i=0; i<obs.length - 1; i++) {
                    var obj = obs[i];
                    var nextObj = obs[i + 1];
                    if (obj.name == nextObj.name) {
                        obj.availability.get(0).stop = nextObj.availability.get(0).start;
                    }
                    else {
                        JulianDate.addMinutes(obj.availability.get(0).start,
                            getMaxTimeIntervalForStation(obj.name), obj.availability.get(0).stop);
                    }
                    
                }
                
                // Set Default end time to last object
                var lastObj = obs[obs.length - 1];
                
                if (lastObj) {
                    JulianDate.addMinutes(lastObj.availability.get(0).start,
                        getMaxTimeIntervalForStation(lastObj.name), lastObj.availability.get(0).stop);
                }
            } catch (e) {
                console.error("error here : " + e.stack);                
            }
            
            /**
             * Gets the maximum number of minutes in a time interval for the given
             * station ID.
             * @param {string} name
             * @return {number}  minutes
             */
            function getMaxTimeIntervalForStation(name) {
                //
                // Changed this to 48 hours from 3 hours so that these sites do not fade out. 
                // This type of source data is hardware which will always exist. so they should not 
                // get removed. The data can be stale but until we move to constant updates we 
                // do not need to worry about that.
                //
                var DEFAULT_STOP = 72 * 60;   // 3 hours
                var minutes = 0;
                var foundStation = false;
                
                for (var i=0; i<obs.length; i++) {
                    var obj = obs[i];
                    if (obj.name == name) {
                        foundStation = true;
                        var secsDiff = JulianDate.secondsDifference(obj.availability.get(0).stop, obj.availability.get(0).start);
                        minutes = Math.max(minutes,  secsDiff/TimeConstants.SECONDS_PER_MINUTE);
                    } else if (foundStation) {
                        // Since these objects have been sorted by station, we know we 
                        // can break out early when search moves on to next station
                        break;                       
                    }
                }
                
                if (minutes == 0) {
                    minutes = DEFAULT_STOP;
                }
                //return minutes;
                return DEFAULT_STOP;
            }
            
            /**
             * Comparator for observation objects. Sorts by station ID and then start
             * time within the station IDs.
             * @param {Entity} ob1
             * @param {Entity} ob2
             * @return {number}
             */
            function compareObs(ob1, ob2) {
                if (ob1.name < ob2.name) {
                    return -1;
                }
                else if (ob1.name > ob2.name) {
                    return 1;
                }
                else {
                    var start1 = ob1.availability.get(0).start;
                    var start2 = ob2.availability.get(0).start;     
                    return JulianDate.compare(start1, start2);
                }
            }
        }
    }
    
    /**
     * Creates the dynamic object.
     * @param {Object} amvObject
     * @param {EntityCollection} entityCollection
     * 
     *  Modified Works
     */
    function createObject(amvObject, entityCollection) {
        var  id = createGuid();
        var entity = entityCollection.getOrCreateEntity(id);
        entity.bdaType = 'VECTOR';
        entity.availability = getTimeInterval(amvObject);
        entity.description = makeDescription(amvObject);
        entity.name = amvObject.lat + '_' + amvObject.lon + '_' + amvObject.pressure;   // make up name
        
        return entity;
    }

    /**
     * Gets time interval. 
     * @param {Object} amvObject
     * @return {TimeIntervalCollection}
     * 
     * Modified works
     */
    function getTimeInterval(amvObject) {
        var timeInterval;
        var timeString = amvObject.day.substring(0, 4) + '-' + amvObject.day.substring(4, 6) 
            + '-' + amvObject.day.substring(6, 8) + 'T' + amvObject.hms.substring(0,2)
            + ':' + amvObject.hms.substring(2,4) + ':00Z';
        var startTime = new Date(timeString);
        // The stop time will be calculated at the end and the timeInterval will be updated.
        // See computeEndTime().
        timeInterval = new TimeInterval({ start: JulianDate.fromDate(startTime), stop: JulianDate.fromDate(startTime)});
        
        var timeIntervalCollection = new TimeIntervalCollection();
        timeIntervalCollection.addInterval(timeInterval);
        
        return timeIntervalCollection; 
    }
    
    /**
     * Parses amv data line.
     * @param {ObsDataSource} dataSource
     * @param {String} line
     */       
    function parseLine(dataSource, line, windType, level, crsFunction) {
        var parts = line.split(/     |    |   |  | /);
        
        if (parts[0] == windType) {
            var amvObject = { type: parts[0], sat: parts[1], day: parts[2], hms: parts[3],
                    lat: parseFloat(parts[4]), lon: parseFloat(parts[5]), 
                    pressure: parseFloat(parts[6]),
                    windSpeed: Units.convert(parseFloat(parts[7]), Units.UNITS.METERS_PER_SEC, Units.UNITS.KNOTS),
                    windDirection: parseFloat(parts[8])};
            if (((level == 'Upper' && amvObject.pressure <= 500) ||
                 (level == 'Lower' && amvObject.pressure >= 400)) && amvObject.windSpeed >=5) {
                parsePoint(dataSource, amvObject, level, crsFunction);
            }
        }        
    }
    
    /**
     * Parses point data in file.
     * @param {ObsDataSource} dataSource
     * 
     * Modified Works
     */
    function parsePoint(dataSource, amvObject, level, crsFunction) {
        try {
            var entity = createObject(amvObject, dataSource._entityCollection);
            entity.merge(dataSource.defaultMarker);
            
            var markerColor = getPressureColor(amvObject.pressure, level);
            entity.label.fillColor = markerColor;
            entity.label.outlineColor = markerColor;
            entity.label.text = getDirectionMarker(amvObject.windDirection); 
            entity.merge(dataSource.defaultVector);
            
            var coords = [];
            coords.push(amvObject.lon);
            coords.push(amvObject.lat);
            coords.push(lookupHeight(amvObject.pressure) * 15);  // exaggerate height
            
            var isNorthernHemisphere = coords[1] >= 0 ? true : false;
            
            var image = getWindBarb(amvObject, markerColor, isNorthernHemisphere);
            entity.billboard.image = image;
            entity.billboard.rotation = computeRotation(amvObject.windDirection, isNorthernHemisphere);
            entity.position = crsFunction(coords);
        } catch (e) {
            console.error('error: ' + e);
        }   
    }

    /**
     * Maps pressure to an approximate altitude in meters.
     * @param {number} pressure in mb
     * @return {number} altitude in m
     */
    function lookupHeight(pressure) {
        var altitude;
        
        // Upper Level
        if (pressure < 100) {
            altitude = 16000;
        } 
        else if (pressure <= 250) {
            altitude = 13000;
        }
        else if (pressure <= 350) {
            altitude = 9000;
        }
        else if (pressure <= 500) {
            altitude = 6500;
        }
        
        // Lower Level
        else if (pressure < 600) {
            altitude = 5500;
        }
        else if (pressure < 800) {
            altitude = 3000;
            
        }
        else {
            altitude = 1000;
        }
        
        return altitude;
    }
    
    /**
     * Determines the marker direction based on wind direction.
     * Wind direction is divided into 8 sectors: N, NE, E, SE, S, SW, W, NW.
     * @param {String} directionString
     * @return {String} unicode for arrow
     */
    function getDirectionMarker(directionString) {
        var marker;
        var direction = parseInt(directionString);
        
        if ((direction >=0 && direction <22.5) || (direction >= 337.5 && direction <= 360)) {
            // North
            marker = '\u2191';
        }
        else if (direction >=22.5 && direction <67.5) {
            // Northeast
            marker = '\u2197';
        }
        else if (direction >=67.5 && direction <112.5) {
            // East
            marker = '\u2192';
        }
        else if (direction >= 112.5 && direction <= 157.5) {
            // Southeast
            marker = '\u2198';
        }
        else if (direction >= 157.5 && direction < 202.5) {
            // South
            marker = '\u2193';
        }
        else if (direction >= 202.5 && direction <= 247.5) {
            // Southwest
            marker = '\u2199';
        }
        else if (direction >= 247.5 && direction <= 292.5) {
            // West
            marker = '\u2190';
        }
        else if (direction >=292.5 && direction <337.5) {
            // Northwest
            marker = '\u2196';
        }
        
        return marker;
    }
    
    /**
     * Makes an html description of the amvobject.
     * @param {Object} amvObject
     * @param {String} html description string 
     */
    function makeDescription(amvObject) {
        return '<table><tr><td>Wind Speed:</td><td>' + amvObject.windSpeed + ' kts'
            + '</td></tr> <tr><td>Wind Direction:</td> <td>' + amvObject.windDirection
            + '<td></tr> <tr><td>Pressure:</td> <td>' + amvObject.pressure 
            + ' mb<td></tr></table>';
    }
    
    /**
     * Determines the color based on pressure and level.
     * @param {number} pressure
     * @param {String} level either 'Upper' or 'Lower' 
     * @return {Color}
     */
    function getPressureColor(pressure, level) {
        var color = Color.WHITE;
        
        if (level == 'Upper') {
            if (pressure <= 250) {
                color = Color.CYAN;
            }
            else if (pressure <= 350) {
                color = Color.YELLOW;
            }
            else {
                color = Color.GREEN;
            }
        }
        else if (level == 'Lower') {
            if (pressure < 600) {
                color = Color.CYAN;
            }
            else if (pressure < 800) {
                color = Color.YELLOW;
            }
            else {
                color = Color.GREEN;
            }
        }
        
        return color;
    }
    
    /**
     * Creates the svg xml wind barb based on the wind speed, direction, and
     * color.
     * @param {Object} amvObject
     * @param {Color} markerColor
     * @param {boolean} isNorthernHemisphere
     * @return {String} svg xml or path to png
     */
    function getWindBarb(amvObject, markerColor, isNorthernHemisphere) {
        
        if (window.chrome) {
            // Google Chrome still has issues with overlapping SVG images using
            // Cesium's billboard image, so let's look up the png file            
            var imagePath;
            var nearestWindSpeed = Math.floor(amvObject.windSpeed / 5) * 5;
            var colorStr = Color.equals(markerColor, Color.GREEN) ? 'green' : (Color.equals(markerColor, Color.YELLOW) ? 'yellow' : 'cyan');
            //if (isNorthernHemisphere) {
                imagePath = 'resources/icons/WindVectors/Wind_' + colorStr + '_' + nearestWindSpeed + '.png';
            //} // TODO: create southern hemisphere png files
            
            return imagePath;
        }

        var height = 50;
        var width = 50;
        var x0 = width/10;
        var y0 = height/2;
        var x1 = width;
        var y1 = height/2;
        var top = height/4;
        var spacing = width/12;
        var pennantSpacing = spacing/2;        
        var color = markerColor.toCssColorString();
 
        // Draw staff as horizontal line through center of image
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" height="' + height + '" width="'
            + width + '" stroke="' + color + '" fill="'+ color + '" stroke-width="1">'
            + '<path d="M' + x0 + ' ' + y0 + 'L' + x1 + ' ' + y1 + '"  />';
        
        // Draw pennants
        var startX = x0;
        var startY = y0;
        var numPennants = Math.floor(amvObject.windSpeed / 50);
        
        if (isNorthernHemisphere) {
            // Draw Flags and pennants to right of staff (up)
            if (numPennants > 0) {
                for (var i=0; i<numPennants; i++) {
                    // Draw 50 mph Pennants on wind barb
                    svg += '<polygon points="'+ startX + ',' + startY + ' '+ (startX) + ',' + top + ' ' + (startX+spacing) + ',' + startY  + '"/>';    
                    startX += spacing + pennantSpacing;
                }
                startX += pennantSpacing;
            }
            
            // Draw 10 mph flags on wind barb
            var windRemainder = amvObject.windSpeed % 50;
            var numFlags = Math.floor(windRemainder / 10);
            if (numFlags > 0) {
                for (var i=0; i< numFlags; i++) {
                    var endX = startX - x0;
                    svg += '<path d="M'+ startX + ' ' + startY + ' L'+ endX + ' ' + top + '"/>"';
                    startX += spacing;
                }
            }
            
            // Draw 5 mph flag on wind barb
            if (windRemainder % 10 >= 5) {
                var endX = startX - (x0/2);
                var endY = height * (3/8);
                svg += '<path d="M'+ startX + ' ' + startY + ' L'+ endX + ' ' + endY + '"/>"';
            }
        }
        else {
            // Draw Flags and pennants to left of staff (down)
            // TODO: Draw southern hemisphere
        }
        
        svg += '</svg>';
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    }

    /**
     * Calculates the vector rotation in radians based on wind direction.
     * @param {number}  windDirection
     * @param {boolean} isNorthernHemisphere
     * @param {number} rotation in radians
     */
    function computeRotation(windDirection, isNorthernHemisphere) {
        var windDir = 0;
        var rotateToZero = isNorthernHemisphere ? 270 : 90;
        windDir = CesiumMath.toRadians(rotateToZero - windDirection);  
        
        return windDir;
    };
    
    return AmvParser;
});
