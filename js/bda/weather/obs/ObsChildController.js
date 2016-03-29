/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Bda/framework/ChildController',
    'Bda/weather/obs/ObsDataSource',
    'Bda/util/Util',
    'Bda/util/PropertiesUi',
    'Cesium/Core/Cartesian3',
    'Cesium/Core/ClockRange',
    'Cesium/Core/ClockStep',
    'Cesium/Core/Color',
    'Cesium/Core/defined',
    'Cesium/Core/EventHelper',
    'Cesium/Core/JulianDate',
    'Cesium/Core/loadXML',
    'Cesium/Core/PolygonHierarchy',
    'Cesium/Core/TimeInterval',
    'Cesium/DataSources/ConstantProperty',
    'Cesium/DataSources/DataSourceClock',
    'Cesium/DataSources/StripeMaterialProperty',
    'Cesium/Scene/Billboard',
    'Cesium/Scene/Label',
    'DrawHelper/PolygonPrimitive',
    'DrawHelper/DrawHelper',
    'Cesium/Scene/Material',
    'Cesium/ThirdParty/when'
], function(
    ChildController,
    ObsDataSource,
    Util,
    PropertiesUi,
    Cartesian3,
    ClockRange,
    ClockStep,
    Color,
    defined,
    EventHelper,
    JulianDate,
    loadXML,
    PolygonHierarchy,
    TimeInterval,
    ConstantProperty,
    DataSourceClock,
    StripeMaterialProperty,
    Billboard,
    Label,
    PolygonPrimitive,
    DrawHelper,
	Material,
    when
)
{
    "use strict";


    var theViewer;
    var dataSources;
	var drawHelper;
    var sigmetDisplayPrimitive;
    var showObs = {showLabel: false, showBarb: false, showPoint: true};
    var propertiesUis = {};
    var that;

    /** @const */ var METAR_ERROR_MESSAGE = 'Error Requesting METARs';
    /** @const */ var TAF_ERROR_MESSAGE = 'Error Requesting TAFs';
    /** @const */ var SIGMETS_ERROR_MESSAGE = 'Error Requesting Sigmets';
    /** @const */ var AIRREPORT_ERROR_MESSAGE = 'Error Requesting Aircraft Reports';

    /**
     * ObsChildController Object. It controls interactions between the MetocVis UI
     * controls and the Cesium map.
     * @constructor
     * @param {Viewer} viewer  The viewer instance
     */
    var ObsChildController = function(viewer) {
        theViewer = viewer;
        drawHelper = new DrawHelper(theViewer);

        ChildController.apply(this, arguments);
        dataSources = theViewer.dataSources;
        setupListeners();
        that = this;
    };

    ObsChildController.prototype = Object.create(ChildController.prototype);
    ObsChildController.prototype.constructor = ObsChildController;

    /**
     * Handles METOCVis objects selected on 3d map.
     * @param {DynamicObj} pickedOb
     * @param {number} x  x position of mouse click
     * @param {number} y  y position of mouse click
     */
    ObsChildController.prototype.handlePrimitivePicked = function(pickedOb, x, y) {
        var properties = pickedOb.envProperties;
        if (defined(properties) && ((pickedOb.bdaType == 'METAR') || (pickedOb.bdaType == 'TAF') || (pickedOb.bdaType == 'AircraftReport'))) {   // TODO: create a function to check bda for observation data type (i.e. METAR, etc)
            var obFloatingPane;
            var propertiesUi = propertiesUis[pickedOb.name];
            if (propertiesUi == null) {
                // Create Floating Pane
                var scope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
                obFloatingPane = scope.addFloatingPane(pickedOb.name, pickedOb.name, 'bda-TitledFloatingPane');

                if (pickedOb.rawText) {
                    var rawDiv = document.createElement('div');
                    rawDiv.className = 'bda-obs-rawText';
                    var rawP = document.createElement('p');
                    var rawTextNode = document.createTextNode(pickedOb.rawText);
                    rawP.appendChild(rawTextNode);
                    rawDiv.appendChild(rawP);
                    obFloatingPane.appendChild(rawDiv);
                }

                // Create Floating Pane content, properties and add them
                propertiesUi = new PropertiesUi(properties);
                obFloatingPane.appendChild(propertiesUi._div);
                obFloatingPane.onmousedown = icaoSelectedListener;
                propertiesUis[pickedOb.name] = propertiesUi;
            }
            else {
                obFloatingPane = propertiesUi.getParent();
            }

            // Set position and make visible
            var style = "position:absolute;top:"+y+"px;left:"+x+"px; display: block;";
            obFloatingPane.style.cssText = style;

            obFloatingPane.classList.toggle('selected');
            propertiesUi.setAvailability(pickedOb.availability);

            // Make XY plot visible
            that.hideXyPlot(false);

            // Unselect old previous ICAO
            var plotScope = angular.element(document.getElementById("plot")).scope();
            if (defined(plotScope.currentPlot) && propertiesUis[plotScope.currentPlot]) {
                propertiesUis[plotScope.currentPlot].toggleSelected();
            }

            // Update xy plot
            var obsData = {};
            obsData['lineData'] = getStationData(pickedOb.name, plotScope.parameters);
            obsData['unitsData'] = this.getUnitData(pickedOb.name, plotScope.parameters, dataSources, ObsDataSource);
            plotScope.changePlot(pickedOb.name, obsData);
        }
    };

    /**
     * Handles when camera height changes.
     * Updates what part of METOCVis object is displayed.
     * @param {number} height
     */
    ObsChildController.prototype.handleCameraHeightChanged = function(height) {
        // Apply METAR SLD settings
        var showLabel = false;
        var showBarb = false;
        var showPoint = false;

        if (height <= 1500000) {
            showLabel = true;
        }

        if (height < 1500000) {
            showBarb = true;
        }
        else if (height < 50000000) {
            showPoint = true;
        }

        if (showLabel != showObs.showLabel || showBarb != showObs.showBarb || showPoint != showObs.showPoint) {
            showObs.showLabel = showLabel;
            showObs.showBarb = showBarb;
            showObs.showPoint = showPoint;

            updateShowObs();
        }
    };

    /**
     * Updates floating panes to show properties for the correct time interval.
     * @param {Clock} clock  The Cesium timeline clock
     */
    ObsChildController.prototype.syncClock = function(clock) {
        // Update floating panes data
        for (var property in propertiesUis) {
            var pane = propertiesUis[property];
            if (pane.isShowing()) {
                var availability = pane.getAvailability();
                if (!TimeInterval.contains(availability.get(0), clock.currentTime)) {
                    try {
                        // Look for same title and valid availability
                        for (var i=0; i<dataSources.length; i++) {
                            var dataSource = dataSources.get(i);
                            if (dataSource instanceof ObsDataSource) {
                                var entityCollection = dataSource.entities;
                                var objects = entityCollection.values;
                                for (var j=0; j<objects.length; j++) {
                                    var obj = objects[j];
                                    if (defined(obj.envProperties) && defined(obj.point)
                                        && obj.name == property
                                        && TimeInterval.contains(obj.availability.get(0), clock.currentTime))
                                    {
                                        pane.setAvailability(obj.availability);
                                        pane.setProperties(obj.envProperties);
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (ex) {
                        console.error("error sync clock: " + ex.stack);
                    }
                }
            }
        }
    };

    /**
     * Sets up listeners on the angular variables.
     */
    function setupListeners() {
        var scope = angular.element(document.getElementById('weatherCtrl')).scope();
        scope.$watch('readMetarSites', function(newVal, oldVal, scope) {
            if (scope.readMetarSites) {
        	    getMetarSites();
        	    scope.readMetarSites = false;
            }	
        });
        
        scope.$watch('toggledGetMetars', function(newVal, oldVal, scope) {
            if (newVal != oldVal) {
                if (newVal) {
                    getMetars();
                }
                else {
                    var dataSourceToDelete = that.getDataSourceById(dataSources, scope.weatherService.metarId);
                    if (dataSourceToDelete) {
		                dataSources.remove(dataSourceToDelete, true);
		                that.bumpPlotTasksCounter(-1);
		                that.bumpThresholdingTasksCounter(-1);
		                that.bumpMetarTafCounter(-1);
                    }
                }
            }
        });

        scope.$watch('toggledGetTafs', function(newVal, oldVal, scope) {
            if (newVal != oldVal) {
                if (newVal) {
                    getTafs();
                }
                else {
                    var dataSourceToDelete = that.getDataSourceById(dataSources, scope.weatherService.tafId);
                    if (dataSourceToDelete) {
		                dataSources.remove(dataSourceToDelete, true);
		                that.bumpPlotTasksCounter(-1);
		                that.bumpThresholdingTasksCounter(-1);
		                that.bumpMetarTafCounter(-1);
                    }
                }
            }
        });

        scope.$watch('toggledGetSigmets', function(newVal, oldVal, scope) {
            if (newVal != oldVal) {
                if (newVal) {
                    getSigmets();
                }
                else {
                	removeSigmets(dataSources);
                }
            }
        });

        scope.$watch('toggledGetAirReport', function(newVal, oldVal, scope) {
            if (newVal != oldVal) {
                if (newVal) {
                    getAirReports();
                }
                else {
                    var dataSourceToDelete = that.getDataSourceById(dataSources, scope.weatherService.aircraftreportId);
                    if (dataSourceToDelete) {
		                dataSources.remove(dataSourceToDelete, true);
		                that.bumpPlotTasksCounter(-1);
		                that.bumpThresholdingTasksCounter(-1);
		                that.bumpMetarTafCounter(-1);
                    }
                }
            }
        });
    }

    /**
     * Gets station data for all times in data source.
     * It returns an array of station objects made up of time and the requested
     * parameter data.
     * @param {string} name  The station id (usually ICAO station)
     * @param {Array}  parameters  The array of parameters that should be included in station data
     */
    function getStationData(name, parameters) {
        var stationData = [];
        var foundStation = false;

        try {
            for (var i=0; i<dataSources.length; i++) {
                var dataSource = dataSources.get(i);
                if (dataSource instanceof ObsDataSource) {
                    var entityCollection = dataSource.entities;
                    var objects = entityCollection.values;
                    for (var j=0; j<objects.length; j++) {
                        var obj = objects[j];
                        if (defined(obj.name) && obj.name == name) {
                            foundStation = true;
                            var properties = obj.envProperties;
                            var station = {};
                            station['time'] = JulianDate.toDate(obj.availability.get(0).start).getTime();
                            for (var k=0; k<parameters.length; k++) {
                                if (properties.hasOwnProperty(parameters[k])) {
                                    station[parameters[k]] = properties[parameters[k]].getValueString();
                                    if (isNaN(station[parameters[k]]) || isNaN(parseFloat(station[parameters[k]]))) {
                                        station[parameters[k]] = null;
                                    }
                                }
                                else {
                                    station[parameters[k]] = null;
                                }
                            }
                            stationData.push(station);
                        } else if (foundStation) {
                            // Since these objects have been sorted by station, we know we
                            // can break out early when search moves on to next station
                            break;
                        }
                    }
                }
            }
        } catch (ex) {
            console.error("error getting station data for : " + name + ' error='+ ex);
        }

        // TODO fix this to recieve multiple data points for graphs
        //      also develop a graph for one point.
        if (stationData.length == 1) {
           var tmpObj  = stationData[0];
           var tmpObj0 = tmpObj.constructor();
           var tmpObj1 = tmpObj.constructor();
           var tmpObj2 = tmpObj.constructor();
           var tmpObj3 = tmpObj.constructor();

           for (var attr in tmpObj) {
        	   if (tmpObj.hasOwnProperty(attr)) {
        		  tmpObj0[attr] = tmpObj[attr];
        		  tmpObj1[attr] = tmpObj[attr];
        		  tmpObj2[attr] = tmpObj[attr];
        		  tmpObj3[attr] = tmpObj[attr];
        	   }
           }

           var time = tmpObj['time'];
           tmpObj0['time'] = time + 36000000;
           tmpObj0['airTemperature'] = tmpObj['airTemperature'] + 10.0;
           tmpObj0['horizontalVisibility'] = tmpObj['horizontalVisibility'] + 20.0;
           tmpObj0['windSpeed'] = tmpObj['windSpeed'] + 10.0;
           stationData.push(tmpObj0);

           time = tmpObj0['time'];
           tmpObj1['time'] = time + 36000000;
           tmpObj1['airTemperature'] = tmpObj['airTemperature'] + 10.0;
           tmpObj1['horizontalVisibility'] = tmpObj['horizontalVisibility'] + 30.0;
           tmpObj1['windSpeed'] = tmpObj['windSpeed'] + 20.0;
           stationData.push(tmpObj1);

           time = tmpObj1['time'];
           tmpObj2['time'] = time + 36000000;
           tmpObj2['airTemperature'] = tmpObj['airTemperature'] - 10.0;
           tmpObj2['horizontalVisibility'] = tmpObj['horizontalVisibility'] + 40.0;
           tmpObj2['windSpeed'] = tmpObj['windSpeed'] + 30.0;
           stationData.push(tmpObj2);

           time = tmpObj2['time'];
           tmpObj3['time'] = time + 36000000;
           tmpObj3['airTemperature'] = tmpObj['airTemperature'] - 5.0;
           tmpObj3['horizontalVisibility'] = tmpObj['horizontalVisibility'] + 50.0;
           tmpObj3['windSpeed'] = tmpObj['windSpeed'] + 30.0;
           stationData.push(tmpObj3);
        }

        return stationData;
    }

    /**
     * Listens for selected ICAO events.
     * Updates the d3 plot with selected ICAO, and shows the panel as selected.
     * @param {MouseEvent} event
     */
    function icaoSelectedListener(event) {
        var scope = angular.element(document.getElementById("plot")).scope();

        // Unselect old current icao floating pane
        if (defined(scope.currentPlot && propertiesUis[scope.currentPlot])) {
            propertiesUis[scope.currentPlot].toggleSelected();
        }

        // Set selected icao as current icao in xy plot
        var obsData = {};
        obsData['lineData'] = getStationData(this.id, scope.parameters);
        obsData['unitsData'] = that.getUnitData(this.id, scope.parameters, dataSources, ObsDataSource);
        scope.changePlot(this.id, obsData);

        // Select icao floating pane
        this.classList.toggle('selected');
    }

    /**
     * Updates observation dataSource object in the maps dynamic scene based on
     * whether the label, wind barb, or point should be showing.
     */
    function updateShowObs() {
        try {
            for (var i=0; i<dataSources.length; i++) {
                var dataSource = dataSources.get(i);
                if (dataSource instanceof ObsDataSource) {
                    var entityCollection = dataSource.entities;
                    var objects = entityCollection.values;
                    for (var j=0; j<objects.length; j++) {
                        var obj = objects[j];
                        if (defined(obj.envProperties)) {
                            if (defined(obj.label)) {
                                obj.label.show._value = showObs.showLabel;
                            }
                            if (defined(obj.billboard)) {
                                obj.billboard.show._value = showObs.showBarb;
                            }
                            if (defined(obj.point)) {
                                obj.point.show._value = showObs.showPoint;
                            }
                        }
                    }
                    // Tell map that object changed by raising event
                    dataSource.changedEvent.raiseEvent(dataSource);
                }
            }
        } catch (ex) {
            console.error("error updating obs: " + ex);
        }
    }

    /**
     * Loads the weather object file. Requests the file, parses it into dynamcic objects
     * that can be displayed on Cesium map.
     * @param {string} url
     */
    function loadFile(url, bdaType) {

        when (loadXML(url), processLoadSuccess, processLoadFailure);

        /**
         * Processes the load failure.
         * @param {String} error
         */
        function processLoadFailure(error) {
            that.hideProgressBar();
			if (bdaType == 'metar') {
			   showMetarError(METAR_ERROR_MESSAGE, bdaType);
			}
			else if (bdaType == 'taf') {
			   showTafError(TAF_ERROR_MESSAGE);
			}
			else if (bdaType == 'sigmet') {
				showMetarError(SIGMETS_ERROR_MESSAGE, bdaType);
			}
			else if (bdaType == 'airreport') {
				showMetarError(AIRREPORT_ERROR_MESSAGE, bdaType);
			} else {
			    showMetarError('Undefined Data Type', bdaType);
			}

            console.error(error);
        }

        /**
         * Processes XML METAR data and adds them to the map.
         * @param {Document} xmlDoc
         */
        function processLoadSuccess(xmlDoc) {
            that.hideProgressBar();
            if (!defined(xmlDoc)) {
                alert("error reading " + bdaType + " file: " + http.statusText);
            }

            if (bdaType == 'metarsite') {
            	var dataSource = new ObsDataSource('metar');
            } else {
            	var dataSource = new ObsDataSource(bdaType);            	
            }
            
            dataSource.load(xmlDoc);
			dataSource.sigmetDisplay = [];

            var entityCollection = dataSource.entities;
            if (entityCollection.values.length == 0) {
				if (bdaType == 'metar') {
				   showMetarError("No METAR data for selected time range and area.", bdaType);
				}
				else if (bdaType == 'taf') {
				   showTafError("No TAF data for selected time range and area.");
				}
				else if (bdaType == 'sigmet') {
					showMetarError("No SIGMET data for selected time range and area.", bdaType);
				}
				else {
					showMetarError("No Aircraft Report data for selected time range and area.", bdaType);
				}
                return;
            }

            if (bdaType == 'metarsite') {
               var solidColor = Color.RED;
            }
            else if (bdaType == 'sigmet') {
               var solidColor = Color.RED;
               var alphaColor = Color.clone(solidColor);
               alphaColor.alpha = 0.5;

			   for (var j = 0; j < entityCollection.values.length; j++) {
				   var location = [];
				   var sigObj   = entityCollection._entities._array[j];

				   for (var k = 0; k < sigObj.lat.length; k++) {
					   location.push(parseFloat(sigObj.lon[k].textContent));
					   location.push(parseFloat(sigObj.lat[k].textContent));
				   }

				   var newPoints = Cartesian3.fromDegreesArray(location);
                   var polygon = new PolygonPrimitive({
                                         positions: newPoints,
                                         material: Material.fromType('Color', {color: alphaColor})
                                                      }, drawHelper._defaultSurfaceOptions);
                   theViewer.scene.primitives.add(polygon);

 				   dataSource.sigmetDisplay.push(polygon);
			   }

               dataSources.add(dataSource);
			}
			else {
               // set the clock
               var timeInterval = entityCollection.computeAvailability();
               var dataSourceClock = new DataSourceClock();
               dataSourceClock.startTime = timeInterval.start;
               dataSourceClock.stopTime = timeInterval.stop;
               dataSourceClock.clockRange = ClockRange.LOOP_STOP;

               // dataSourceClock.multiplier = 1.0;
               dataSourceClock.multiplier = 50.0;
               dataSourceClock.currentTime = dataSourceClock.startTime;
               dataSourceClock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
               dataSource.clock = dataSourceClock;

               //dataSources.removeAll();    // TODO: do i really want to do this?? or should merge times??

               // Update TimeLine and clock
               // Note: live data shouldn't have to do this, but test data does
               if (defined(theViewer.timeline)) {
                   dataSourceClock.getValue(theViewer.clock);
                   theViewer.timeline.updateFromClock();
                   theViewer.timeline.zoomTo(dataSourceClock.startTime, dataSourceClock.stopTime);
               }

               // Set new ID property on dataSource
               var scope = angular.element(document.getElementById('weatherCtrl')).scope();

			   // Check to see what data source we are dealing with and set the ID correctly
			   if (bdaType == 'metar') { 
                  dataSource.id = scope.weatherService.metarId;
			   }
			   else if (bdaType == 'taf') {
                  dataSource.id = scope.weatherService.tafId;
			   }
			   else if (bdaType == 'sigmet') {
                  dataSource.id = scope.weatherService.sigmetsId;
			   }
			   else {
                  dataSource.id = scope.weatherService.aircraftreportId;
			   }

               // Add observation objects to dynamic scene
               dataSources.add(dataSource);
               dataSources.dataSourceRemoved.addEventListener(onDataSourceRemoved, dataSource);

               // Make adjustments for camera height
               updateShowObs();

           	   // Make Thresholding and XY Plot functionalities available
               that.bumpPlotTasksCounter(1);
               that.bumpThresholdingTasksCounter(1);
               that.bumpMetarTafCounter(1);
			}
        }
    }

    /**
     * Loads Default Site location information 
     */
    function getMetarSites() {
        var url  = "resources/data/METAR_station_locations.xml";
        try {
        	loadFile(url, 'metarsite');
        } catch (e) {
        	showMetarError(METAR_ERROR_MESSAGE, 'metarsite');
        }
    }
    
    /**
     * Loads METAR data for the selected area and time period.
     */
    function getMetars() {
        var url = makeUrl('metar');
        try {
            loadFile(url, 'metar');
        } catch (e) {
        	showMetarError(METAR_ERROR_MESSAGE,'metar');
        }
    }

    /**
     * Loads TAF data for the selected area and time period.
     */
    function getTafs() {
        var url = makeUrl('taf');
        try {
            loadFile(url, 'taf');
        } catch (e) {
        	showTafError(TAF_ERROR_MESSAGE);
        }
    }

	function removeSigmets(dataSources) {
	   for (var i = 0; i < dataSources.length; i++) {
           var dataSource = dataSources.get(i);
           if (dataSource instanceof ObsDataSource) {
	          for (var j = 0; j < dataSource.sigmetDisplay.length; j++) {
			      dataSource.sigmetDisplay[j].show = false;
			  }
		   }
	   }
	}

    /**
     * Loads Sigmet data for the selected area and time period.
     */
    function getSigmets() {
        var url = makeUrl('sigmet');
        try {
            loadFile(url, 'sigmet');
        } catch (e) {
        	showMetarError(SIGMETS_ERROR_MESSAGE, 'sigmet');
        }
    }

    /**
     * Loads Aircraft Reprot data for the selected area and time period.
     */
    function getAirReports() {
        var url = makeUrl('airreport');
        try {
            loadFile(url, 'airreport');
        } catch (e) {
        	showMetarError(AIRREPORT_ERROR_MESSAGE, 'airreport');
        }
    }

    /**
     * Updates the obsError with the metar id. This will trigger an event that
     * will display error to user.
     * @param {String} errorMessage
     */
    function showMetarError(errorMessage, bdaType) {
    	var scope = angular.element(document.getElementById('weatherCtrl')).scope();
    	scope.weatherService.errorMessage = errorMessage;
    	if (bdaType == 'metar') {
     	   scope.weatherService.obsError = scope.weatherService.metarId;
    	} else if (bdaType == 'sigmet') {
      	   scope.weatherService.obsError = scope.weatherService.sigmetsId;
    	} else {
      	   scope.weatherService.obsError = scope.weatherService.aircraftreportId;
    	}
    }

    /**
     * Updates the obsError with the metar id. This will trigger an event that
     * will display error to user.
     * @param {String} errorMessage
     */
    function showTafError(errorMessage) {
    	var scope = angular.element(document.getElementById('weatherCtrl')).scope();
    	scope.weatherService.errorMessage = errorMessage;
    	scope.weatherService.obsError = scope.weatherService.tafId;
    }

    /**
     * Makes the observation URL request string based on observation data type.
     * @param {string} bdaType
     */
    function makeUrl(bdaType) {
        var scope = angular.element(document.getElementById('weatherCtrl')).scope();
        var preferencesScope = angular.element(document.getElementById('userPreferencesCtrl')).scope();
        var obsDataSource = preferencesScope.userPreferencesService.preferences.obsDataSource;

        if (obsDataSource == preferencesScope.userPreferencesService.TESTFILE_OBS_SOURCE) {
            return "resources/data/" + scope.weatherService.metarTestFile;
        }
        else if (obsDataSource == preferencesScope.userPreferencesService.GEOSERVER_OBS_SOURCE) {
            var utilAndToolsScope = angular.element(document.getElementById('utilAndToolsCtrl')).scope();
            var url = scope.weatherService.geoserverUrl + "/wfs?request=GetFeature&typeName="+bdaType+"&count=8000&outputFormat=wxxm";

            var encodedQuote = encodeURIComponent("'");
            var cqlFilter = '&cql_filter=(samplingTime+BETWEEN+'
                + utilAndToolsScope.getStartTimeString() + '+AND+'
                + utilAndToolsScope.getEndTimeString() + ')+AND+BBOX(location,'
                + utilAndToolsScope.getAreaOfInterest() + ',' + encodedQuote + 'EPSG:4326'+ encodedQuote + ')';

            return url + cqlFilter;
        }
        else if ((obsDataSource == preferencesScope.userPreferencesService.ADDS_OBS_SOURCE) && (bdaType == 'metar')) {    // Aviation Digital Data Service
            var utilAndToolsScope = angular.element(document.getElementById('utilAndToolsCtrl')).scope();

            var url = scope.weatherService.ncarUrl;

            // Use proxy to overcome cross-origin issues
            url = scope.weatherService.proxy  + '/proxy?url=' + encodeURIComponent(url + "metars.cache.xml");

            return url;
			//return "resources/data/weather/metars.cache.xml";
        }
        else if ((obsDataSource == preferencesScope.userPreferencesService.ADDS_OBS_SOURCE) && (bdaType == 'taf')) {
            var utilAndToolsScope = angular.element(document.getElementById('utilAndToolsCtrl')).scope();

            var url = scope.weatherService.ncarUrl;

            // Use proxy to overcome cross-origin issues
            url = scope.weatherService.proxy  + '/proxy?url=' + encodeURIComponent(url + "tafs.cache.xml");

            return url;
			//return "resources/data/weather/tafs.cache.xml";

        }
        else if ((obsDataSource == preferencesScope.userPreferencesService.ADDS_OBS_SOURCE) && (bdaType == 'sigmet')) {
            var utilAndToolsScope = angular.element(document.getElementById('utilAndToolsCtrl')).scope();

            var url = scope.weatherService.ncarUrl;

            // Use proxy to overcome cross-origin issues
            url = scope.weatherService.proxy  + '/proxy?url=' + encodeURIComponent(url + "airsigmets.cache.xml");

            return url;
			//return "resources/data/weather/airsigmets.cache.xml";

        }
        else if ((obsDataSource == preferencesScope.userPreferencesService.ADDS_OBS_SOURCE) && (bdaType == 'airreport')) {
            var utilAndToolsScope = angular.element(document.getElementById('utilAndToolsCtrl')).scope();

            var url = scope.weatherService.ncarUrl;

            // Use proxy to overcome cross-origin issues
            url = scope.weatherService.proxy  + '/proxy?url=' + encodeURIComponent(url + "aircraftreports.cache.xml");

            return url;
			//return "resources/data/weather/aircraftreports.cache.xml";

        }
    }

    /**
     * Handles data source removed event. Cleans up any floating panes and
     * hides the d3 plot.
     * @param {DataSourceCollection} dataSourceCollection
     * @param {DataSource} dataSource
     */
    function onDataSourceRemoved (dataSourceCollection, dataSource) {
        if (dataSource instanceof ObsDataSource) {
            dataSourceCollection.dataSourceRemoved.removeEventListener(onDataSourceRemoved, dataSource);

            // Destroy any floating panes
            for (var property in propertiesUis) {
                if (propertiesUis.hasOwnProperty(property)) {
                    var pane = propertiesUis[property].getParent();
                    pane.removeEventListener('mousedown', icaoSelectedListener, false);
                    propertiesUis[property].destroy();
                    Util.purge(pane);   // make sure all listeners are deleted
                    pane.parentNode.removeChild(pane);
                }
            }
            propertiesUis = {};

            // Hide d3 plot
            that.hideXyPlot(true);

            // Clear plot
            var scope = angular.element(document.getElementById("plot")).scope();
            scope.clearPlot();
        }
    }

    /**
     * Applies inputted thresholding onto METOCVis plotted objects.
     * @param {Array} thresholds  array of selected threshold values per threshold parameter
     */
    ObsChildController.prototype.applyThresholding = function(thresholds) {
        try {
            for (var i=0; i<dataSources.length; i++) {
                var dataSource = dataSources.get(i);
                if (dataSource instanceof ObsDataSource) {
                    var entityCollection = dataSource.entities;
                    var objects = entityCollection.values;
                    for (var j=0; j<objects.length; j++) {
                        var obj = objects[j];
                        if (defined(obj.envProperties) && defined(obj.point)) {
                            obj.point.color = this.getThresholdColor(obj.envProperties, thresholds);
                            obj.point.outlineColor = obj.point.color;
                            if (defined(obj.label)) {
                                obj.label._fillColor = obj.point.color;
                            }
                        }
                    }
                }
            }
        } catch (ex) {
            console.error("error applying thresholds: " + ex);
        }
    };

    /**
     * Clears thresholding. The observation objects are reverted back to blue
     * and parameters are reverted back to white in the floating panes.
     */
    ObsChildController.prototype.clearThresholding = function() {
        try {
            var blue = new ConstantProperty(Color.BLUE);
			var cyan = new ConstantProperty(Color.CYAN);
			var lightgreen = new ConstantProperty(Color.LIGHTGREEN);
            var white = new ConstantProperty(Color.WHITE);

            for (var i=0; i<dataSources.length; i++) {
                var dataSource = dataSources.get(i);
                if (dataSource instanceof ObsDataSource) {
                    var entityCollection = dataSource.entities;
                    var objects = entityCollection.values;
                    for (var j=0; j<objects.length; j++) {
                        var obj = objects[j];
                        if (defined(obj.envProperties) && defined(obj.point)) {
						    if (obj.bdaType == "AircraftReport")
							{
                               obj.point.color = cyan;
                               obj.point.outlineColor = cyan;
							} else if (obj.bdaType == "TAF")
							{
                               obj.point.color = lightgreen;
                               obj.point.outlineColor = lightgreen;
							} else
							{
                               obj.point.color = blue;
                               obj.point.outlineColor = blue;
							}
                            if (defined(obj.label)) {
                                obj.label._fillColor = white;
                            }

                            // clear properties in floating panes
                            for (var key in obj.envProperties) {
                                var property = obj.envProperties[key];
                                if (defined(property.color) && property.color != ChildController.DEFAULT_PROPERTY_COLOR) {
                                    var oldColor = property.color;
                                    property.color = ChildController.DEFAULT_PROPERTY_COLOR;
                                    property.propertyChanged.raiseEvent(property, 'color', property.color, oldColor);
                                }
                            }
                        }
                    }
                }
            }
        } catch (ex) {
            console.error("error clearing thresholds: " + ex);
        }
    };

    return ObsChildController;
});