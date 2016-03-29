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
    
    var WxxmParser = {};
    
    /**
     * Parses the wxxm xml document into the dataSource. Parsing is based on the
     * GML wxxm schema.
     * @param {ObsDataSource} dataSource
     * @param {document} wxxm xml document to be parsed
     * @param {function} crsFunction
     */
    WxxmParser.parseXmlData = function(dataSource, xml, crsFunction) {
        parseNameSpaces(xml);
        // Check for FeatureCollection
        var featureCollection = getElementsByTagNameFromXml(xml, WX + ":FeatureCollection"); 
        
        if (featureCollection[0] != null) {
            parseFeatureCollection(dataSource, xml, crsFunction);
        }
        else {
            var supported = isFeatureSupported(xml);
            if (supported) {
                parseFeature(dataSource, xml, crsFunction) ;
            }
        }
    };
    
    /**
     * Parses a gml FeatureCollection
     * @param {WxxmDataSource} dataSource
     * @param {Document} featureCollection
     * @param {function} crsFunction
     */
    function parseFeatureCollection(dataSource, featureCollection, crsFunction) {
        
        var features = getElementsByTagNameFromXml(featureCollection, WX + ":featureMember");
        
        if (!defined (features)) {
            throw new RuntimeError('Invalid wxxm file');
        }
        if (features.length == 0) {
            throw new RuntimeError('No observation returned');
        }
        
        for (var i=0, len=features.length; i<len; i++) {
            parseFeature(dataSource, features[i], crsFunction);
        }
        
        computeStopTime(dataSource);
        
        /**
         * Computes the stop time of each object based on next object of same 
         * station id. 
         * @param {WxxmDataSource} dataSource
         */
        function computeStopTime(dataSource) {
            try {
                var wxxmObjects = dataSource.entities.values;
                wxxmObjects.sort(compareWxxmObjects);
                
                for (var i=0; i<wxxmObjects.length - 1; i++) {
                    var obj = wxxmObjects[i];
                    var nextObj = wxxmObjects[i + 1];
                    if (obj.name == nextObj.name) {
                        obj.availability.get(0).stop = nextObj.availability.get(0).start;
                    }
                    else {
                        JulianDate.addMinutes(obj.availability.get(0).start,
                            getMaxTimeIntervalForStation(obj.name), obj.availability.get(0).stop);
                    }
                    
                }
                
                // Set Default end time to last object
                var lastObj = wxxmObjects[wxxmObjects.length - 1];
                JulianDate.addMinutes(lastObj.availability.get(0).start,
                    getMaxTimeIntervalForStation(lastObj.name), lastObj.availability.get(0).stop);            
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
                var DEFAULT_STOP = 3 * 60;   // 3 hours
                var minutes = 0;
                var foundStation = false;
                
                for (var i=0; i<wxxmObjects.length; i++) {
                    var obj = wxxmObjects[i];
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
                return minutes;               
            }
            
            /**
             * Comparator for wxxm objects. Sorts by station ID and then start
             * time within the station IDs.
             * @param {Entity} wxxm1
             * @param {Entity} wxxm2
             * @return {number}
             */
            function compareWxxmObjects(wxxm1, wxxm2) {
                if (wxxm1.name < wxxm2.name) {
                    return -1;
                }
                else if (wxxm1.name > wxxm2.name) {
                    return 1;
                }
                else {
                    var start1 = wxxm1.availability.get(0).start;
                    var start2 = wxxm2.availability.get(0).start;     
                    return JulianDate.compare(start1, start2);
                }
            }
        }
    };

    /**
     * Creates the dynamic object.
     * @param {Document} xml
     * @param {EntityCollection} entityCollection
     */
    function createObject(xml, entityCollection) {
        var  id = createGuid();
        var entity = entityCollection.getOrCreateEntity(id);
        entity.bdaType = 'METAR';    // TODO: get from XML
        entity.rawText = parseXmlForRawText(xml);
        entity.availability = parseXmlForTimeInterval(xml);
        entity.envProperties = parseXmlForObservationProperties(xml);
        entity.name = parseXmlForStationId(xml);
        entity.issueTime = parseXmlForIssueTime(xml);
        entity.automated = parseXmlForAutomated(xml);
        entity.missing = parseXmlForMissing(xml);
        entity.forecast = parseXmlForForecast(xml);
        
        return entity;
    }

    /**
     * Parses MetarSpeci data. 
     * @param {WxxmDataSource} dataSource
     * @param {Document} xml
     */
    function parseMetarSpeci(dataSource, xml, crsFunction, source) {
        var geometry = parseXmlForGeometry(xml);
        if (!defined(geometry)) {
            throw new RuntimeError('location is required.');
        }

        if (geometry === null) {
            //Null geometry is allowed, so just create an empty entity instance for it.
            createObject(x, dataSource._entityCollection);
        } else {
            var geometryType = 'Point';    // TODO: look up type in xml
            var geometryHandler = geometryTypes[geometryType];
            if (!defined(geometryHandler)) {
                throw new RuntimeError('Unknown geometry type: ' + geometryType);
            }
            geometryHandler(dataSource, xml, geometry, crsFunction, source);
        }
    }
    
    /**
     * Parses TAF data. 
     * @param {WxxmDataSource} dataSource
     * @param {Document} xml
     */
    function parseTaf(dataSource, xml, notUsed, crsFunction, source) {
        // TODO:
        throw new RuntimeError('parseTaf not implemented');
    }
 
    /**
     * Parses xml document for the raw text message. 
     * @param {Document} xml
     * @return {string}
     */
    function parseXmlForRawText(xml) {
        var rawText;
        var rawTextNode = getElementsByTagNameFromXml(xml, AVWX + ":rawText"); 
        if (rawTextNode[0] != null) {
            rawText = rawTextNode[0].textContent;
        }
        
        return rawText;
    }

    /**
     * Parses the xml for time interval. 
     * @param {Document} xml
     * @return {TimeIntervalCollection}
     */
    function parseXmlForTimeInterval(xml) {
        var timeInterval;
        var aeroNode = getElementsByTagNameFromXml(xml, AVWX + ":aerodromeWxObservation");
        
        if (aeroNode[0] != null) {
            var obsNode = getElementsByTagNameFromXml(aeroNode[0], WX + ":Observation");
            if (obsNode[0] != null) {
                var timeSamplingNode = getElementsByTagNameFromXml(obsNode[0], OM + ":samplingTime");
                if (timeSamplingNode[0] != null) {
                    var timeInstantNode = getElementsByTagNameFromXml(timeSamplingNode[0], GML + ":TimeInstant");
                    if (timeInstantNode[0] != null) {
                        var timePosNode = getElementsByTagNameFromXml(timeInstantNode[0], GML + ":timePosition");
                        if (timePosNode[0] != null) {
                            var time = timePosNode[0].textContent;
                            var startTime = new Date(time);
                            // The stop time will be calculated at the end and the timeInterval will be updated.
                            // See computeEndTime().
                            timeInterval = new TimeInterval({ start: JulianDate.fromDate(startTime), stop: JulianDate.fromDate(startTime)});
                        }
                    }
                }
            }
        } 
        
        var timeIntervalCollection = new TimeIntervalCollection();
        timeIntervalCollection.addInterval(timeInterval);
        return timeIntervalCollection; 
    }
    
    /**
     * Parses the xml for observation properties. 
     * @param {Document} xml
     * @return {Object}
     */
    function parseXmlForObservationProperties(xml) {
        var properties = {};
        var aeroNode = getElementsByTagNameFromXml(xml, AVWX + ":aerodromeWxObservation");
        
        if (aeroNode[0] != null) {
            var obsNode = getElementsByTagNameFromXml(aeroNode[0], WX + ":Observation");
            if (obsNode[0] != null) {
                var resultNode = getElementsByTagNameFromXml(obsNode[0], OM + ":result");
                if (resultNode[0] != null) {
                    var aerodrome = getElementsByTagNameFromXml(resultNode[0], AVWX + ":AerodromeWx");
                    if (aerodrome[0] != null) {
                        var nodes = aerodrome[0].children;      // children only includes (nodetype == 1)
                        
                        for (var i=0; i<nodes.length; i++) {
                            var units = undefined;
                            if (nodes[i].attributes != null) {
                                var uom = nodes[i].attributes.getNamedItem("uom");
                                if (uom != null) {
                                    units = uom.value;
                                }
                            }
                            
                            var value = getValue(nodes[i]);
                              
                            var property = new ObsProperty(units, value);
                            if (properties[nodes[i].localName]) {
                                // TODO: use array of ObsProperty instead of single property
                                //       this would accomdate for CloudCondition which can have
                                //       multiple entries base on level                             
                            }
                            else {
                                properties[nodes[i].localName] = property;
                            }
                                
                        }
                    }                   
                }
            }
        }
        return properties;
        
        /**
         * Gets value of xml node.
         * @param {Document} node 
         */
        function getValue(node) {
            
            if (node.childElementCount > 0) {
                // Retrieve properties
                var properties = {};
                for (var i=0; i<node.childElementCount; i++) {
                    var units = undefined;
                    if (node.children[i].attributes != null) {
                        var uom = node.children[i].attributes.getNamedItem("uom");
                        if (uom != null) {
                            units = uom.value;
                        }
                    }
                    
                    var property = new ObsProperty(units, getValue(node.children[i]));
                    properties[node.children[i].localName] = property;
                }
                    return properties;                   
            }
            else {
                // Check nodes for text
                var value = "";
                for (var i=0; i<node.childNodes.length; i++) {
                    if (node.childNodes[i].nodeType == 3) {
                        value = value + " " + node.childNodes[i].nodeValue;
                    }
                }
                return value;
               
            }
        }
    }
    
    /**
     * Parses the xml for geometry.
     * @param {Document} xml 
     * @return {string}
     */
    function parseXmlForGeometry(xml) {
        var geometry;
        
        // SurfaceReport and SurfForecastReport schema have Geometry embedded in 'appliesTo' property
        var appliesToNode = getElementsByTagNameFromXml(xml, AVWX + ":appliesTo"); 
        if (appliesToNode[0] != null) {
            var aerodromeNode = getElementsByTagNameFromXml(appliesToNode[0], AVWX + ":Aerodrome");
            if (aerodromeNode[0] != null) {
                // TODO: see if location (in GML 3.2) deprecated and what new property is
                var locationNode = getElementsByTagNameFromXml(aerodromeNode[0], GML + ":location");
                if (locationNode[0] != null) {
                    var pointNode = getElementsByTagNameFromXml(locationNode[0], GML + ":Point");
                    // TODO: update crs using srsname in Point node
                    if (pointNode[0] != null) {
                        var pos = getElementsByTagNameFromXml(pointNode[0], GML + ":pos");
                        if (pos[0] != null) {
                            geometry = pos[0];
                        }
                    }
                }
            }
        }
        return geometry;     
    }    
    
    /**
     * Parses the xml for station ID.
     * @param {Document} xml 
     * @return {string}
     */
    function parseXmlForStationId(xml) {
        var stationId;
        var stationIdNode = getElementsByTagNameFromXml(xml, AVWX + ":stationId"); 
        if (stationIdNode[0] != null) {
            stationId = stationIdNode[0].textContent;
        }
        
        return stationId;
    }
    
    /**
     * Parses the xml for issue time.
     * @param {Document} xml 
     * @return {string}
     */
    function parseXmlForIssueTime(xml) {
        return null;
    }
    
    /**
     * Parses the xml for automated.
     * @param {Document} xml 
     * @return {string}
     */
    function parseXmlForAutomated(xml) {
        return null;
    }
    
    /**
     * Parses the xml for missing.
     * @param {Document} xml 
     * @return {string}
     */
    function parseXmlForMissing(xml) {
        return null;
    }

    /**
     * Parses the xml for forecast.
     * @param {Document} xml 
     * @return {string}
     */
    function parseXmlForForecast(xml) {
        return null;
    }
    
    /**
     * Verifies if a feature is supported. 
     * @param {Document} xml 
     * @return {boolean}
     */
    function isFeatureSupported(xml) {
        var found = false;
        var objectTypes = Object.getOwnPropertyNames(wxxmObjectTypes);
        for (var i=0; i<objectTypes.length; i++) {
            var obs = getElementsByTagNameFromXml(xml, AVWX + ":"+ objectTypes[i]);
            if (obs[0] != null) {
                found = true;
                break;
            }
        }
        
        return found;
    }

    /**
     * Parses a gml Feature.
     * @param {WxxmDataSource} dataSource
     * @param {Document} feature
     */       
    function parseFeature(dataSource, feature, crsFunction) {
        var objectTypes = Object.getOwnPropertyNames(wxxmObjectTypes);
        
        for (var i=0; i<objectTypes.length; i++) {
            var obs = getElementsByTagNameFromXml(feature, AVWX + ":"+ objectTypes[i]);
            for (var j=0; j<obs.length; j++) {
                wxxmObjectTypes[objectTypes[i]](dataSource, obs[j], crsFunction);
            }
        }
    }

    /**
     * Parses point data in file.
     * @param {WxxmDataSource} dataSource
     * @param {Document} xml
     */
    function parsePoint(dataSource, xml, geometry, crsFunction) {
        var entity = createObject(xml, dataSource._entityCollection);
        entity.merge(dataSource.defaultPoint);
        entity.merge(dataSource.defaultLabel);
        entity._label.text = new ConstantProperty(entity.name); 
        entity.merge(dataSource.defaultWindBarb);
        
        var coordsStr = geometry.firstChild.data.split(" ");
        var coords = [];
        for (var i=0; i<coordsStr.length; i++) {
            coords.push(parseFloat(coordsStr[i]));
        }
        
        var isNorthernHemisphere = coordsStr[1] >= 0 ? true : false;
        entity._billboard.image = new ConstantProperty(WindBarb.lookupImage(entity.envProperties, isNorthernHemisphere));
        entity._billboard.rotation = new ConstantProperty(WindBarb.getWindDirInRadians(entity.envProperties, isNorthernHemisphere));
        entity.position = new ConstantProperty(crsFunction(coords));
    }
    
    /**
     * Gets the elements by tag name from the xml document.
     * @param {Document} xml
     * @param {string} tag
     */
    function getElementsByTagNameFromXml(xml, tag) {
        if (window.chrome) {
            // remove name space from tag in chrome
            var strings = tag.split(':');
            var newTag = strings.length > 0 ? strings[1] : string[0];
            return xml.getElementsByTagName(newTag);
        }
        else {
            return xml.getElementsByTagName(tag);
        }
    }
    
    var wxxmObjectTypes = {
        METAR : parseMetarSpeci,
        METARSpeci : parseMetarSpeci,
        TAF : parseTaf,
    };

    var geometryTypes = {
        Point : parsePoint,
    };

     /**
     * Parses the wxxm document for gml namespaces. 
     * @param {Document} wxxm The object to be parseed.
     */
    function parseNameSpaces(wxxm) {
        // TODO: read xmlns statements to get namespace prefix and set to variables below
        var wx;
        var avwx;
        var om;
        var gml;
        
        WX = defaultValue(wx, "wx");
        AVWX = defaultValue(avwx, "avwx");
        OM = defaultValue(om, "om");
        GML = defaultValue(gml, "gml");
    }
       
    var WX = undefined;
    var AVWX = undefined;
    var OM = undefined;
    var GML = undefined;
        
    return WxxmParser;
});
