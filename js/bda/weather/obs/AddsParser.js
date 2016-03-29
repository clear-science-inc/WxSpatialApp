/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
        'Bda/util/ObsProperty',
        'Bda/weather/obs/WindBarb',
        'Cesium/Core/createGuid',
        'Cesium/Core/JulianDate',
        'Cesium/Core/TimeInterval',
        'Cesium/Core/TimeIntervalCollection',
        'Cesium/Core/defaultValue',
        'Cesium/Core/defined',
        'Cesium/Core/RuntimeError',
        'Cesium/Core/TimeConstants',
        'Cesium/DataSources/ConstantProperty',
        'Cesium/DataSources/Entity',
        'Cesium/DataSources/EntityCollection'
    ], function(
        ObsProperty,
        WindBarb,
        createGuid,
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        defaultValue,
        defined,
        RuntimeError,
        TimeConstants,
        ConstantProperty,
        Entity,
        EntityCollection) {
    "use strict";

    var AddsParser = {};

    /** @const */ var HEADER_PROPERTIES = ['raw_text', 'latitude', 'longitude', 'quality_control_flags', 'metar_type'];
                  var siteNames = [];
    /**
     * Parses the ADDS xml document into the dataSource. Parsing is based on the
     * defined schema {@link http://weather.aero/schema/metar.xsd}
     * @param {ObsDataSource} dataSource
     * @param {document} ADDS response xml document to be parsed
     * @param {function} crsFunction
     */
    AddsParser.parseXmlData = function(dataSource, xml, crsFunction) {
        // Check for response elemernt
        var response = xml.getElementsByTagName("response");

        if (response && response.length > 0) {
            parseResponse(dataSource, xml, crsFunction);
        }
        else {
            throw new RuntimeError('Invalid ADDS xml file');
        }
    };

    /**
     * Parses an ADDS METOC observation xml response.
     * @param {XmlDataSource} dataSource
     * @param {Document} xml
     */
    function parseResponse(dataSource, xml, crsFunction) {
        var dataCollection = xml.getElementsByTagName("data");

        for (var i=0, len=dataCollection.length; i<len; i++) {
            parseDataElement(dataSource, dataCollection[i], crsFunction);
        }

        computeStopTime(dataSource);

        /**
         * Computes the stop time of each object based on next object of same
         * station id.
         * @param {XmlDataSource} dataSource
         *
         * Modified Works
         */
        function computeStopTime(dataSource) {
            try {
                var xmlObjects = dataSource.entities.values;
                xmlObjects.sort(compareXmlObjects);

                for (var i=0; i<xmlObjects.length - 1; i++) {
                    var obj = xmlObjects[i];
                    var nextObj = xmlObjects[i + 1];
                    if (obj.name == nextObj.name) {
                        obj.availability.get(0).stop = nextObj.availability.get(0).start;
                    }
                    else {
                        JulianDate.addMinutes(obj.availability.get(0).start,
                            getMaxTimeIntervalForStation(obj.name), obj.availability.get(0).stop);
                    }

                }

                // Set Default end time to last object
                var lastObj = xmlObjects[xmlObjects.length - 1];

                if (defined(lastObj)) {
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

                for (var i=0; i<xmlObjects.length; i++) {
                    var obj = xmlObjects[i];
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
             * Comparator for xml objects. Sorts by station ID and then start
             * time within the station IDs.
             * @param {Entity} xml1
             * @param {Entity} xml2
             * @return {number}
             */
            function compareXmlObjects(xml1, xml2) {
                if (xml1.name < xml2.name) {
                    return -1;
                }
                else if (xml1.name > xml2.name) {
                    return 1;
                }
                else {
                    var start1 = xml1.availability.get(0).start;
                    var start2 = xml2.availability.get(0).start;
                    return JulianDate.compare(start1, start2);
                }
            }
        }
    }

    /**
     * Creates the dynamic object.
     * @param {Document} xml
     * @param {EntityCollection} entityCollection
     *
     *  Modified Works
     */
    function createObject(xml, entityCollection) {
        var  id = createGuid();
        var entity = entityCollection.getOrCreateEntity(id);

		entity.bdaType = xml.nodeName;
        entity.rawText = parseXmlForRawText(xml);
        entity.availability = parseXmlForTimeInterval(xml);

        if (xml.nodeName == "AIRSIGMET") {
           entity.max_alt   = parseXmlForMaxAlt(xml);
           entity.min_alt   = parseXmlForMinAlt(xml);
           entity.hazard    = parseXmlForHazard(xml);
           entity.airsigmet = parseXmlForAirSigmetType(xml);
           entity.lat       = parseXmlForLatitudes(xml);
		   entity.lon       = parseXmlForLongitudes(xml);
        }
        else {
           entity.envProperties = parseXmlForObservationProperties(xml);
           entity.name = parseXmlForStationId(xml);
           entity.issueTime = parseXmlForIssueTime(xml);
           entity.automated = parseXmlForAutomated(xml);
           entity.missing = parseXmlForMissing(xml);
           entity.forecast = parseXmlForForecast(xml);
        }
        return entity;
    }

    /**
     * Parses MetarSpeci data.
     * @param {XmlDataSource} dataSource
     * @param {Document} xml
     *
     * Modified Works
     */
    function parseMetarSpeci(dataSource, xml, crsFunction) {
    	var icao_code = parseXmlForStationId(xml);
        var Lat = parseXmlForLat(xml);
        var Lon = parseXmlForLon(xml);
        
        if ((!defined(Lat)) || (!defined(Lon)) ||
            (Lat === null) || (Lon === null)) {
        	if (defined(siteNames[icao_code])) {
        		var Lat = siteNames[icao_code][0];
        		var Lon = siteNames[icao_code][1];

                var geometryType = 'Point';
                var geometryHandler = geometryTypes[geometryType];
                if (!defined(geometryHandler)) {
                   throw new RuntimeError('Unknown geometry type: ' + geometryType);
                }
                geometryHandler(dataSource, xml, Lat, Lon, crsFunction);
        	}
        	else {
        		throw new RuntimeError('location is required.');
        	}
        } else {
            var geometryType = 'Point';
            var geometryHandler = geometryTypes[geometryType];
            if (!defined(geometryHandler)) {
               throw new RuntimeError('Unknown geometry type: ' + geometryType);
            }
            geometryHandler(dataSource, xml, Lat, Lon, crsFunction);        	
        }

        //        var Lat = parseXmlForLat(xml);
//        if (!defined(Lat)) {
//            throw new RuntimeError('location is required.');
//        }
//
//        var Lon = parseXmlForLon(xml);
//        if (!defined(Lon)) {
//            throw new RuntimeError('location is required.');
//        }
//
//        if ((Lat === null) || (Lon === null)) {
//            //Null geometry is allowed, so just create an empty entity instance for it.
//            createObject(xml, dataSource._entityCollection);
//        } else {
//            var geometryType = 'Point';
//            var geometryHandler = geometryTypes[geometryType];
//            if (!defined(geometryHandler)) {
//                throw new RuntimeError('Unknown geometry type: ' + geometryType);
//            }
//            geometryHandler(dataSource, xml, Lat, Lon, crsFunction);
//        }
    }

    /**
     * Parses TAF data.
     * @param {XmlDataSource} dataSource
     * @param {Document} xml
     */
    function parseTafSpeci(dataSource, xml, crsFunction) {
        var Lat = parseXmlForLat(xml);
        if (!defined(Lat)) {
            throw new RuntimeError('location is required.');
        }

        var Lon = parseXmlForLon(xml);
        if (!defined(Lon)) {
            throw new RuntimeError('location is required.');
        }

        if ((Lat === null) || (Lon === null)) {
            //Null geometry is allowed, so just create an empty entity instance for it.
            createObject(xml, dataSource._entityCollection);
        } else {
            var geometryType = 'Point';
            var geometryHandler = geometryTypes[geometryType];
            if (!defined(geometryHandler)) {
                throw new RuntimeError('Unknown geometry type: ' + geometryType);
            }
            geometryHandler(dataSource, xml, Lat, Lon, crsFunction);
        }
    }

    function parseSiteMetarSpeci(dataSource, xml, crsFunction) {
    	if (!defined(siteNames)) { siteNames = []; }
    	
        var Lat = parseXmlForLat(xml);
        var Lon = parseXmlForLon(xml);
        var Ele = parseXmlForElevation(xml);
        
    	var icao_code = parseXmlForStationId(xml);
    	siteNames[icao_code] = [Lat, Lon, Ele];
    }
    
    /**
     * Parses Sigmet data.
     * @param {XmlDataSource} dataSource
     * @param {Document} xml
     */
    function parseSigmetSpeci(dataSource, xml, crsFunction) {
 /*       var Lat = parseXmlForLat(xml);
        if (!defined(Lat)) {
            throw new RuntimeError('location is required.');
        }

        var Lon = parseXmlForLon(xml);
        if (!defined(Lon)) {
            throw new RuntimeError('location is required.');
        }

       if ((Lat === null) || (Lon === null)) {
            //Null geometry is allowed, so just create an empty entity instance for it.
            createObject(xml, dataSource._entityCollection);
        } else {
            var geometryType = 'Point';
            var geometryHandler = geometryTypes[geometryType];
            if (!defined(geometryHandler)) {
                throw new RuntimeError('Unknown geometry type: ' + geometryType);
            }
            geometryHandler(dataSource, xml, Lat, Lon, crsFunction);
        } */

        var geometryType = 'Polygon';
        var geometryHandler = geometryTypes[geometryType];
        if (!defined(geometryHandler)) {
            throw new RuntimeError('Unknown geometry type: ' + geometryType);
        }

        geometryHandler(dataSource, xml, crsFunction);
    }

    /**
     * Parses Aircraft Report data.
     * @param {XmlDataSource} dataSource
     * @param {Document} xml
     */
    function parseAirReportSpeci(dataSource, xml, crsFunction) {
        var Lat = parseXmlForLat(xml);
        if (!defined(Lat)) {
            throw new RuntimeError('location is required.');
        }

        var Lon = parseXmlForLon(xml);
        if (!defined(Lon)) {
            throw new RuntimeError('location is required.');
        }

        if ((Lat === null) || (Lon === null)) {
            //Null geometry is allowed, so just create an empty entity instance for it.
            createObject(xml, dataSource._entityCollection);
        } else {
            var geometryType = 'Point';
            var geometryHandler = geometryTypes[geometryType];
            if (!defined(geometryHandler)) {
                throw new RuntimeError('Unknown geometry type: ' + geometryType);
            }
            geometryHandler(dataSource, xml, Lat, Lon, crsFunction);
        }
    }

     /**
     * Parses xml document for the raw text message.
     * @param {Document} xml
     * @return {string}
     */
    function parseXmlForRawText(xml) {
        var rawText;

        var raw = xml.getElementsByTagName("raw_text");
        if (raw[0] != null) {
           rawText = raw[0].textContent;
        }

        return rawText;
    }

    /**
     * Parses the xml for time interval.
     * @param {Document} xml
     * @return {TimeIntervalCollection}
     *
     * Modified works
     */
    function parseXmlForTimeInterval(xml) {
        var timeInterval;

        if ((xml.nodeName == 'TAF') || (xml.nodeName == 'AIRSIGMET')) {
            var timePosNode = xml.getElementsByTagName("valid_time_from");
        }
        else {
           var timePosNode = xml.getElementsByTagName("observation_time");
        }

        if (timePosNode[0] != null) {
           var time = timePosNode[0].firstChild.data;
           var startTime = new Date(time);
           // The stop time will be calculated at the end and the timeInterval will be updated.
           // See computeEndTime().
           timeInterval = new TimeInterval({ start: JulianDate.fromDate(startTime), stop: JulianDate.fromDate(startTime)});
        }

        var timeIntervalCollection = new TimeIntervalCollection();
        timeIntervalCollection.addInterval(timeInterval);

        return timeIntervalCollection;
    }

    /**
     * Parses the xml for observation properties.
     * @param {Document} xml
     * @return {Object}
     *
     * Modified Works
     */
    function parseXmlForObservationProperties(xml) {
        var properties = {};
        var nodes = xml.children;      // children only includes (nodetype == 1)

        for (var i=0; i<nodes.length; i++) {
            var name   = nodes[i].localName;
            var skip = false;

            /* Skip over header properties that have already been parsed */
            for (var j=0; j<HEADER_PROPERTIES.length; j++) {
                if (name == HEADER_PROPERTIES[j]) {
                    skip = true;
                    break;
                }
            }

            if (!skip) {
                var units = undefined;
                var scover = " ";
                var cbase  = " ";

                if (nodes[i].attributes != null) {
                     if (nodes[i].localName == "sky_condition") {
                    	var sky_cover = nodes[i].attributes.getNamedItem("sky_cover");
                        var cloud_base_ft_agl = nodes[i].attributes.getNamedItem("cloud_base_ft_agl");

                        if (sky_cover != null) { scover = sky_cover.value; }
                        if (cloud_base_ft_agl != null) { cbase = cloud_base_ft_agl.value + " ft agl"; }
                     }
                }

                if (nodes[i].localName == "sky_condition") {
                    var value = scover + " " + cbase + " " + getValue(nodes[i]);
                    var name = "Sky Condition";
                }
                else {
                   var value = getValue(nodes[i]);
                }

                switch(name) {
                // Map special thresholding parameters property name
                    case "temp_c":
                        name = "airTemperature";
                        units = "C";
                        break;
                    case "wind_speed_kt":
                        name = "windSpeed";
                        units="kt";
                        break;
                    case "visibility_statute_mi":
                        name = "horizontalVisibility";
                        units="mi";
                        break;
                    case "wind_dir_degrees":
                        name = "windDirection";
                        break;
                    case "dewpoint_c":
                        name = "dewpointTemperature";
                        units="C";
                        break;
                // Map into readable name and units
                    case "sea_level_pressure_mb":
                        name = "Sea Level Pressure";
                        units = "mb";
                        break;
                    case "altim_in_hg":
                        name = "altimeter";
                        units = "hg";
                        break;
                    case "flight_category":
                        name = "flightcatagory";
                        break;
                    case "elevation_m":
                        name = "Elevation";
                        units = "m";
                        break;
                    case "precip_in":
                        name = "Precipitation";
                        units = "in";
                        break;
//                    case "station_id":
//                    	name = "icaocode";
//                    	break;
                    case "wind_gust":
                    	name = "Wind Gust";
                    	units = "kt";
                    	break;
                    case "alititude_ft_msl":
                    	name = "altitude";
                    	units = "ft";
                    	break;
                    case "report_type":
                    	name = "Report Type";
						break;
                    case "issue_time":
                    	name = "Issue Time";
						break;
                    case "bulletin_time":
                    	name = "Bulletin Time";
						break;
                    case "valid_time_from":
                    	name = "Valid From";
						break;
                    case "valid_time_to":
                    	name = "Valid To";
						break;
					case "three_hr_pressure_tendency_mb":
					     name = "Pressure Tendency";
						 units = 'mb';
						 break;
                    default:
                        name = name.replace(/_/g, "");
                }

                if (properties[name]) {
                    // Sky conditions can have multiple entries, just append the value
                    properties[name].value +=  ', ' + value;
                }
                else {
				    if (name != 'forecast') {
                       var property = new ObsProperty(units, value);
                       properties[name] = property;
					}
                }
            }
        }

        return properties;

        /**
         * Gets value of xml node.
         * @param {Document} node
         *
         *  Modified Works
         */
        function getValue(xml) {

            if (xml.childElementCount > 0) {
                // Retrieve properties
                var properties = {};
                for (var i=0; i<xml.childElementCount; i++) {
                    var units = undefined;
                    if (xml.children[i].attributes != null) {
                        var uom = xml.children[i].attributes.getNamedItem("uom");
                        if (uom != null) {
                            units = uom.value;
                        }
                    }

                    var property = new ObsProperty(units, getValue(xml.children[i]));
                    properties[xml.children[i].localName] = property;
                    return properties;
                }
            }
            else {
                // Check nodes for text
                var value = "";
                for (var i=0; i<xml.childNodes.length; i++) {
                    if (xml.childNodes[i].nodeType == 3) {
                        value = value + " " + xml.childNodes[i].nodeValue;
                    }
                }
                return value;

            }
        }
    }

    /**
     * Parses the xml for latitudes.
     * @param {Document} xml
     * @return {string}
     *
     * Created Works
     */
    function parseXmlForLatitudes(xml) {
        var lat = xml.getElementsByTagName("latitude");

        return lat;
    }

    function parseXmlForElevation(xml) {
        var elev = xml.getElementsByTagName("elevation_m");
        
        return elev;
    }
    
    /**
     * Parses the xml for lon.
     * @param {Document} xml
     * @return {string}
     *
     * Created Works
     */
    function parseXmlForLongitudes(xml) {
        var lon = xml.getElementsByTagName("longitude");

        return lon;
    }

    /**
     * Parses the xml for lat.
     * @param {Document} xml
     * @return {string}
     *
     * Created Works
     */
    function parseXmlForLat(xml) {
        var Latitude;

        var lat = xml.getElementsByTagName("latitude");
        if (lat[0] != null) {
           Latitude = lat[0];
        }

        return Latitude;
    }

    /**
     * Parses the xml for lon.
     * @param {Document} xml
     * @return {string}
     *
     * Created Works
     */
    function parseXmlForLon(xml) {
        var Longitude;

        var lon = xml.getElementsByTagName("longitude");
        if (lon[0] != null) {
           Longitude = lon[0];
        }

        return Longitude;
    }

    /**
     * Parses the xml for station ID.
     * @param {Document} xml
     * @return {string}
     *
     * Modified Works
     */
    function parseXmlForStationId(xml) {
        var stationId;
        var stationIdNode = xml.getElementsByTagName("icao_code");
        if (stationIdNode[0] != null) {
            stationId = stationIdNode[0].textContent;
        } else {
            var stationIdNode = xml.getElementsByTagName("station_id");
            if (stationIdNode[0] != null) {
                stationId = stationIdNode[0].textContent;
            } else {
                var stationIdNode = xml.getElementsByTagName("aircraft_ref");
                if (stationIdNode[0] != null) {
                    stationId = stationIdNode[0].textContent;
                }
            }
        }

        return stationId;
    }

    /**
     * Parses the xml for issue time.
     * @param {Document} xml
     * @return {string}
     */
    function parseXmlForIssueTime(xml) {
// JPC TODO
        return null;
    }

    function parseXmlForMaxAlt(xml) {
	    var max_alt = 0;

        var max_alt_node = xml.getElementsByTagName("altitude");
        if (max_alt_node[0] != null) {
		   for (var i = 0; i < max_alt_node[0].attributes.length; i++) {
		       if (max_alt_node[0].attributes[i].nodeName == 'max_ft_msl') {
	 	           max_alt = max_alt_node[0].attributes[i].textContent;
				   break;
			   }
		   }
		}

    	return max_alt;
    }

    function parseXmlForMinAlt(xml) {
	    var min_alt = 0;

        var min_alt_node = xml.getElementsByTagName("altitude");
        if (min_alt_node[0] != null) {
		   for (var i = 0; i < min_alt_node[0].attributes.length; i++) {
		       if (min_alt_node[0].attributes[i].nodeName == 'min_ft_msl') {
	 	           min_alt = min_alt_node[0].attributes[i].textContent;
				   break;
			   }
		   }
		}

    	return min_alt;
    }

    function parseXmlForHazard(xml) {
	    var hazard;

        var hazard_node = xml.getElementsByTagName("hazard");
        if (hazard_node[0] != null) {
		   for (var i = 0; i < hazard_node[0].attributes.length; i++) {
		       if (hazard_node[0].attributes[i].nodeName == 'type') {
	 	           hazard = hazard_node[0].attributes[i].textContent;
				   break;
			   }
		   }
		}

    	return hazard;
    }

    function parseXmlForAirSigmetType(xml) {
        var airSigmetType;
        var airSigmetTypeNode = xml.getElementsByTagName("airsigmet_type");

        if (airSigmetTypeNode[0] != null) {
        	airSigmetType = airSigmetTypeNode[0].textContent;
        }

        return airSigmetType;
    }

    /**
     * Parses the xml for automated.
     * @param {Document} xml
     * @return {string}
     */
    function parseXmlForAutomated(xml) {
// JPC TODO
        return null;
    }

    /**
     * Parses the xml for missing.
     * @param {Document} xml
     * @return {string}
     */
    function parseXmlForMissing(xml) {
// JPC TODO
        return null;
    }

    /**
     * Parses the xml for forecast.
     * @param {Document} xml
     * @return {string}
     */
    function parseXmlForForecast(xml) {
// JPC TODO
        return null;
    }

    /**
     * Parses an xml data element.
     * @param {XmlDataSource} dataSource
     * @param {Document} dataElement
     */
    function parseDataElement(dataSource, dataElement, crsFunction) {
        var objectTypes = Object.getOwnPropertyNames(xmlObjectTypes);

        for (var i=0; i<objectTypes.length; i++) {
            var obs = dataElement.getElementsByTagName(objectTypes[i]);
            for (var j=0; j<obs.length; j++) {
            	//
            	// I added this because for the AIRSIGMET we do not care about one lat/lon
            	// these will have multiple ones to generate an area of concern.
            	//
			    if (obs[j].nodeName == "AIRSIGMET") {
                      xmlObjectTypes[objectTypes[i]](dataSource, obs[j], crsFunction);
				}
			    else if (obs[j].nodeName == "SITEMETAR") {
			    	xmlObjectTypes[objectTypes[i]](dataSource, obs[j], crsFunction);
			    }
				else {
//////                   xmlObjectTypes[objectTypes[i]](dataSource, obs[j], crsFunction);
             	   var lat_long = 0;
            	   for (var k=0; k<obs[j].children.length; k++) {
            		   if ((obs[j].children[k].localName == 'latitude') || (obs[j].children[k].localName == 'longitude')) { lat_long++; }
            		   if (lat_long == 2) {break;}
            	   }

              	   if (lat_long == 2) {
                      xmlObjectTypes[objectTypes[i]](dataSource, obs[j], crsFunction);
            	   } 
              	   else {
              		  for (var l=0; l < obs[j].children.length; l++) {
              			  if ((obs[j].children[l].localName == 'icao_code') ||
              				  (obs[j].children[l].localName == 'station_id') ||
              				  (obs[j].children[l].localName == 'aircraft_ref')) {
              			     var icao_code = obs[j].children[l].textContent;
              			     
                   	         if (defined(siteNames[icao_code])) {
                		        var Lat = siteNames[icao_code][0];
                		        var Lon = siteNames[icao_code][1];
                		        var Ele = siteNames[icao_code][2];
                		 
//                  		        obs[j].children.push(Lat);
//                  		        obs[j].children.push(Lon);
//                  		        obs[j].children.push(Ele);
                  		        
                                xmlObjectTypes[objectTypes[i]](dataSource, obs[j], crsFunction);
                                break;
                   	         }
              			  }
                      }
				   }
               }
            }
        }
    }

    /**
     * Parses point data in file.
     * @param {XmlDataSource} dataSource
     * @param {Document} xml
     *
     * Modified Works
     */
    function parsePoint(dataSource, xml, Lat, Lon, crsFunction) {
        var entity = createObject(xml, dataSource._entityCollection);
        entity.merge(dataSource.defaultPoint);
        entity.merge(dataSource.defaultLabel);
        entity._label.text = new ConstantProperty(entity.name);
        entity.merge(dataSource.defaultWindBarb);

        var coords = [];
        coords.push(parseFloat(Lon.firstChild.data));
        coords.push(parseFloat(Lat.firstChild.data));

        var isNorthernHemisphere = coords[1] >= 0 ? true : false;
        entity._billboard.image = new ConstantProperty(WindBarb.lookupImage(entity.envProperties, isNorthernHemisphere));
        entity._billboard.rotation = new ConstantProperty(WindBarb.getWindDirInRadians(entity.envProperties, isNorthernHemisphere));
        entity.position = new ConstantProperty(crsFunction(coords));
    }

    /**
     * Parses mulitple point data in file.
     * @param {XmlDataSource} dataSource
     * @param {Document} xml
     *
     * Modified Works
     */
    function parseMultiplePoints(dataSource, xml, crsFunction) {
        var entity = createObject(xml, dataSource._entityCollection);
        entity.merge(dataSource.defaultPoint);
        entity.merge(dataSource.defaultLabel);
        entity._label.text = new ConstantProperty(entity.name);
//        entity.merge(dataSource.defaultWindBarb);
//
//        var coords = [];
//        coords.push(parseFloat(Lon.firstChild.data));
//        coords.push(parseFloat(Lat.firstChild.data));
//
//        var isNorthernHemisphere = coords[1] >= 0 ? true : false;
//        entity._billboard.image = new ConstantProperty(WindBarb.lookupImage(entity.envProperties, isNorthernHemisphere));
//        entity._billboard.rotation = new ConstantProperty(WindBarb.getWindDirInRadians(entity.envProperties, isNorthernHemisphere));
//        entity.position = new ConstantProperty(crsFunction(coords));
    }

    var xmlObjectTypes = {
        METAR : parseMetarSpeci,
        METARSpeci : parseMetarSpeci,
        TAF : parseTafSpeci,
        AIRSIGMET: parseSigmetSpeci,
        SITEMETAR : parseSiteMetarSpeci,
        AircraftReport: parseAirReportSpeci,
    };

    var geometryTypes = {
        Point : parsePoint,
        Polygon : parseMultiplePoints,
    };

    return AddsParser;
});
