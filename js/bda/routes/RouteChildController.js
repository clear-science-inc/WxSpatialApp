/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Bda/framework/ChildController',
    'Bda/routes/RouteDataSource',
    'Bda/weather/obs/ObsDataSource',
    'Bda/util/PropertiesUi',
    'Bda/util/ObsProperty',
    'Bda/util/Util',
    'Cesium/Core/Cartesian3',
    'Cesium/Core/ClockRange',
    'Cesium/Core/ClockStep',
    'Cesium/Core/Color',
    'Cesium/Core/defined',
    'Cesium/Core/JulianDate',
	'Cesium/Core/Math',
    'Cesium/Core/TimeInterval',
    'Cesium/Core/TimeIntervalCollection',
    'Cesium/DataSources/ColorMaterialProperty',
    'Cesium/DataSources/ConstantProperty',
    'Cesium/DataSources/DataSourceClock',
    'Cesium/DataSources/CzmlDataSource',
    'Cesium/DataSources/VelocityOrientationProperty',
    'Cesium/DataSources/PolylineGlowMaterialProperty',
    'Cesium/DataSources/SampledPositionProperty',
    'Cesium/Scene/HeadingPitchRange'

], function(
    ChildController,
    RouteDataSource,
    ObsDataSource,
    PropertiesUi,
    ObsProperty,
    Util,
    Cartesian3,
    ClockRange,
    ClockStep,
    Color,
    defined,
    JulianDate,
	CMath,
    TimeInterval,
    TimeIntervalCollection,
    ColorMaterialProperty,
    ConstantProperty,
    DataSourceClock,
    CzmlDataSource,
    VelocityOrientationProperty,
    PolylineGlowMaterialProperty,
    SampledPositionProperty,
    HeadingPitchRange
)
{
    "use strict";

    var theViewer;
    var dataSources;
    var propertiesUis = {};
    var that;
    /** @const */ var ROUTES_DEMO_ID = 'RoutesDemo_ID';
    /** @const */ var TRAJ_DEMO_ID = 'TrajectoryDemo_ID';

    /**
     * RouteChildController Object. It controls interactions between the Flight Paths UI
     * controls and the Cesium map.
     * @constructor
     * @param {Viewer} viewer  The viewer instance
     */
    var RouteChildController = function(viewer) {
        theViewer = viewer;
        ChildController.apply(this, arguments);
        dataSources = viewer.dataSources;
        setupListeners();
        that = this;
    };

    RouteChildController.prototype = Object.create(ChildController.prototype);
    RouteChildController.prototype.constructor = RouteChildController;

    function setupListeners() {
        var scope = angular.element(document.getElementById('aviationCtrl')).scope();
        scope.$watch('displayRoutesDemo', function(newVal, oldVal) {
            if (newVal != oldVal) {
                if (newVal) {
                    getRoutes(ROUTES_DEMO_ID);
                }
                else {
                    var dataSourceToDelete = that.getDataSourceById(dataSources, ROUTES_DEMO_ID);
                    if (dataSourceToDelete) {
		                dataSources.remove(dataSourceToDelete, true);
		                that.bumpPlotTasksCounter(-1);
		                that.bumpThresholdingTasksCounter(-1);
                    }
                }
            }
        });
        scope.$watch('displayTrajectoryDemo', function(newVal, oldVal) {
            if (newVal != oldVal) {
                if (newVal) {
                    getRoutes(TRAJ_DEMO_ID);
                }
                else {
                    var dataSourceToDelete = that.getDataSourceById(dataSources, TRAJ_DEMO_ID);
                    dataSources.remove(dataSourceToDelete, true);
	                that.bumpPlotTasksCounter(-1);
	                that.bumpThresholdingTasksCounter(-1);
                }
            }
        });

        scope.$watch('displaySatelliteDemo', function(newVal, oldVal) {
        	if (newVal != oldVal) {
        		if (newVal) {
        			displaySatellite();
        		}
        		else {
        			deleteSatellite('satellite.czml')
        		}
        	}
        });

        scope.$watch('displayInterpDemo', function(newVal, oldVal) {
        	if (newVal != oldVal) {
        		if (newVal) {
        			displayInterp();
        		}
        		else {
        			deleteInterp();
        		}
        	}
        });

        scope.$watch('toggleTopDown', function(newVal, oldVal) {
        	if (newVal) {
			   var ascope = angular.element(document.getElementById('aviationCtrl')).scope();
    	       if (scope.displayInterpDemo) {
    	          theViewer.trackedEntity = undefined;
    	          theViewer.zoomTo(theViewer.entities, new HeadingPitchRange(0, CMath.toRadians(-90)));
    	       }
			   else {
			     scope.toggleTopDown = false;
			   }
        	}
        });

        scope.$watch('toggleSide', function(newVal, oldVal) {
        	if (newVal) {
    	       if (scope.displayInterpDemo) {
    	          theViewer.trackedEntity = undefined;
    	          theViewer.zoomTo(theViewer.entities, new HeadingPitchRange(CMath.toRadians(-90), CMath.toRadians(-15), 7500));
    	       }
			   else {
			      scope.toggleSide = false
			   }
        	}
        });

        scope.$watch('toggleAircraft', function(newVal, oldVal) {
            if (newVal) {
        	   if (scope.displayInterpDemo) {
			   	  for (var i = 0; i < theViewer.interp_entity.length; i++) {
             		  if (theViewer.interp_entity[i].id == theViewer.interp_plane_id) {
    	       	         theViewer.trackedEntity = theViewer.interp_entity[i];
						 break;
				      }
		          }
    	       }
			   else {
			      scope.toggleAircraft = false;
			   }
            }
        });

        scope.$watch('toolbarService.zoomTimeOne', function(newVal, oldVal) {
    	    if (newVal != oldVal) {
    	        if (newVal) {
    	           zoomFirstDate();
    	        }
    	        else {
    	           zoomToday();
    	        }
    	    }
    	});

        scope.$watch('toolbarService.flightCategory', function(newVal, oldVal) {
    	    if (newVal != oldVal) {
    	        if (newVal) {
    	           changeColor();
    	        }
    	        else {
    	           revertColor();
    	        }
    	    }
    	});
    }

    function changeColor() {
        var mvfrColor = new ConstantProperty(Color.BLUE);
		var ifrColor  = new ConstantProperty(Color.RED);
		var lifrColor = new ConstantProperty(Color.PURPLE);
        var defColor  = new ConstantProperty(Color.GOLD);

        for (var i=0; i<dataSources.length; i++) {
            var dataSource = dataSources.get(i);
            if (dataSource instanceof ObsDataSource) {
               var entityCollection = dataSource.entities;
               var objects = entityCollection.values;
               for (var j=0; j<objects.length; j++) {
                    var obj = objects[j];
                    if (defined(obj.envProperties) && defined(obj.point)) {
						if ((obj.bdaType == "TAF") || (obj.bdaType == 'METAR'))
						{
		                   try {
							 var ttt = obj.envProperties.flightcatagory.value;
		                   } catch (ex) {
		                	 var ttt = "none"
		                   }

		                   if ((ttt == 'MVFR') || (ttt == ' MVFR'))
		                   {
                              obj.point.color = mvfrColor;
                              obj.point.outlineColor = mvfrColor;
		                   }
		                   else if ((ttt == 'IFR') || (ttt == ' IFR'))
		                   {
                              obj.point.color = ifrColor;
                              obj.point.outlineColor = ifrColor;
	                	   }
		                   else if ((ttt == 'LIFR') || (ttt == ' LIFR'))
		                   {
                              obj.point.color = lifrColor;
                              obj.point.outlineColor = lifrColor;
	                	   }
		                   else
		                   {
                              obj.point.color = defColor;
                              obj.point.outlineColor = defColor;
	                	   }
						}
                    }
               }
            }
        }
    }

    function revertColor() {
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
						if (obj.bdaType == "TAF")
						{
                           obj.point.color = lightgreen;
                           obj.point.outlineColor = lightgreen;
						}
						else if (obj.bdaType == 'METAR')
						{
                           obj.point.color = blue;
                           obj.point.outlineColor = blue;
						}
                    }
               }
            }
        }
    }

    function zoomFirstDate() {
		//
		// Set bounds of our simulation time
	    //	   - start time is the begining time
		//	   - stop time is the ending time
		//
		var start = JulianDate.fromDate(new Date(2015, 4, 4));
		var stop  = JulianDate.addSeconds(start, 360, new JulianDate());

		//
		// Configure the cesium clock with the times we desire
		//	  - start time
		//	  - stop time (used for play mode)
		//	  - clock range (used to indicate when to stop
		//	  - multiplier (used to indicate how fast to scroll the clock
		//
		theViewer.clock.startTime = start.clone();
		theViewer.clock.stopTime = stop.clone();
		theViewer.clock.clockRange = ClockRange.LOOP_STOP; //Loop at the end
		theViewer.clock.multiplier = 0;

		//
		// setup the current time
		//
		theViewer.clock.currentTime = start.clone();

		//Set timeline to simulation bounds
		theViewer.timeline.zoomTo(start, stop);
    }

    function zoomToday() {
		//
		// Set bounds of our simulation time
	    //	   - start time is the begining time
		//	   - stop time is the ending time
		//
		var start = JulianDate.fromDate(new Date());
		var stop  = JulianDate.addSeconds(start, 360, new JulianDate());

		//
		// Configure the cesium clock with the times we desire
		//	  - start time
		//	  - stop time (used for play mode)
		//	  - clock range (used to indicate when to stop
		//	  - multiplier (used to indicate how fast to scroll the clock
		//
		theViewer.clock.startTime = start.clone();
		theViewer.clock.stopTime = stop.clone();
		theViewer.clock.clockRange = ClockRange.LOOP_STOP; //Loop at the end
		theViewer.clock.multiplier = 0;

		//
		// setup the current time
		//
		theViewer.clock.currentTime = start.clone();

		//Set timeline to simulation bounds
		theViewer.timeline.zoomTo(start, stop);
    }

    /**
     * Displays Interp layer on the map.
     * @param {filename: String, id: String} Interp
     */
    function displayInterp() {

    	//Enable depth testing so things behind the terrain disappear.
    	//theViewer.scene.globe.depthTestAgainstTerrain = true;

    	//Set the random number seed for consistent results.
    	CMath.setRandomNumberSeed(3);

    	//Set bounds of our simulation time
    	var start = JulianDate.fromDate(new Date(2015, 2, 25, 16));
    	var stop  = JulianDate.addSeconds(start, 360, new JulianDate());

    	//Make sure viewer is at the desired time.
    	theViewer.clock.startTime = start.clone();
    	theViewer.clock.stopTime = stop.clone();
    	theViewer.clock.currentTime = start.clone();
    	theViewer.clock.clockRange = ClockRange.LOOP_STOP; //Loop at the end
    	theViewer.clock.multiplier = 10;

    	//Set timeline to simulation bounds
    	theViewer.timeline.zoomTo(start, stop);

		theViewer.interp_entity = [];

    	//Compute the entity position property. for a circle around Brussels Belgium
		// latitude: 50.8 longitude: 4.4 Altitude: 328 ft
    	var position = computeCirclularFlight(4.4, 50.8, 0.10, start);

    	//Actually create the entity
    	var new_entity = theViewer.entities.add({

    	    //Set the entity availability to the same interval as the simulation time.
    	    availability : new TimeIntervalCollection([new TimeInterval({
    	        start : start,
    	        stop : stop
    	    })]),

    	    //Use our computed positions
    	    position : position,

    	    //Automatically compute orientation based on position movement.
    	    orientation : new VelocityOrientationProperty(position),

    	    //Load the Cesium plane model to represent the entity
    	    model : {
    	        uri : './resources/icons/CesiumAir/Cesium_Air.gltf',
    	        minimumPixelSize : 64
    	    },

    	    //Show the path as a pink line sampled in 1 second increments.
    	    path : {
    	        resolution : 1,
    	        material : new PolylineGlowMaterialProperty({
    	            glowPower : 0.1,
    	            color : Color.YELLOW
    	        }),
    	        width : 10
    	    }
    	});

        theViewer.interp_plane_id = new_entity.id;
		theViewer.zoomTo(theViewer.entities, new HeadingPitchRange(0, CMath.toRadians(-90)));
		theViewer.interp_entity.push(new_entity);
    }

    /**
     * Deletes Interp layer on the map.
     * @param {filename: String, id: String} Interp
     */
    function deleteInterp() {
	    for (var i = 0; i < theViewer.interp_entity.length; i++) {
  		   theViewer.interp_entity[i].show = false;
		}
    }

    //Generate a random circular pattern with varying heights.
    function computeCirclularFlight(lon, lat, radius, start) {
        var property = new SampledPositionProperty();
        for (var i = 0; i <= 360; i += 45) {
            var radians = CMath.toRadians(i);
            var time = JulianDate.addSeconds(start, i, new JulianDate());
            var position = Cartesian3.fromDegrees(lon + (radius * 1.5 * Math.cos(radians)), lat + (radius * Math.sin(radians)), CMath.nextRandomNumber() * 500 + 1750);
            property.addSample(time, position);

            //Also create a point for each sample we generate.
            var newpoint = theViewer.entities.add({
                position : position,
                point : {
                    pixelSize : 8,
                    color : Color.TRANSPARENT,
                    outlineColor : Color.YELLOW,
                    outlineWidth : 3
                }
            });

			theViewer.interp_entity.push(newpoint);
        }
        return property;
    }

    /**
     * Displays Satellite layer on the map.
     * @param {filename: String, id: String} Satellite
     */
    function displaySatellite () {
        var czmlDataSource = new CzmlDataSource();
        var dataSources = theViewer.dataSources;

    	//Set bounds of our simulation time
    	var start = JulianDate.fromDate(new Date(2015, 7, 25, 10));
    	var stop  = JulianDate.fromDate(new Date(2015, 7, 26, 10));
//    	var stop  = JulianDate.addSeconds(start, 360, new JulianDate());

        czmlDataSource.load('./resources/data/satellite.czml');

    	//Make sure viewer is at the desired time.
    	theViewer.clock.startTime = start.clone();
    	theViewer.clock.stopTime = stop.clone();
    	theViewer.clock.currentTime = start.clone();
    	theViewer.clock.clockRange = ClockRange.LOOP_STOP; //Loop at the end
    	theViewer.clock.multiplier = 15;

    	//Set timeline to simulation bounds
    	theViewer.timeline.zoomTo(start, stop);

		theViewer.zoomTo(theViewer.entities, new HeadingPitchRange(0, CMath.toRadians(-90)));

        dataSources.add(czmlDataSource);
    }

    /**
     * Deletes a Satellite layer.
     * @param {String} czmlFileName
     */
    function deleteSatellite(czmlFileName) {
        var dataSourceToRemove = getDataSourceByName(theViewer.dataSources, czmlFileName);

        if (dataSourceToRemove) {
            theViewer.dataSources.remove(dataSourceToRemove);
        }

        /**
         * Gets the DataSource by name.
         * @param {DataSourceCollection} dataSources
         * @param {String} name
         * @return {DataSource}
         */
        function getDataSourceByName(dataSources, name) {
            var dataSource;
            for (var i=0; i<dataSources.length; i++) {
                var tmpDataSource = dataSources.get(i);
                if (tmpDataSource.name && tmpDataSource.name == name) {
                    dataSource = tmpDataSource;
                    break;
                }
            }

            return dataSource;
        };
    }

    /**
     * Loads the Flight Paths and adds them to Dynamic scene.
     */
    function getRoutes(demoId) {
        var routeDataSource = new RouteDataSource();
        var _demoId = demoId;

        var whenLoaded = function() {
            // set the clock
            var entityCollection = routeDataSource.entities;
            var timeInterval = entityCollection.computeAvailability();
            var dataSourceClock = new DataSourceClock();
            dataSourceClock.startTime = timeInterval.start;
            dataSourceClock.stopTime = timeInterval.stop;
            dataSourceClock.clockRange = ClockRange.LOOP_STOP;
            var totalSeconds = JulianDate.secondsDifference(dataSourceClock.stopTime, dataSourceClock.startTime);

            var multiplier = Math.round(totalSeconds / 120.0);

            dataSourceClock.multiplier = multiplier;
            dataSourceClock.currentTime = dataSourceClock.startTime;
            dataSourceClock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
            routeDataSource.clock = dataSourceClock;

            // Set new ID property on dataSource
            routeDataSource.id = _demoId;

      //      dataSources.removeAll();    // TODO: do i really want to do this?? or should merge times??

            // Update TimeLine and clock
            if (defined(theViewer.timeline)) {
                dataSourceClock.getValue(theViewer.clock);
                theViewer.timeline.updateFromClock();
                theViewer.timeline.zoomTo(dataSourceClock.startTime, dataSourceClock.stopTime);
            }

            that.hideProgressBar();

            // Add Route objects to dynamic scene
            dataSources.add(routeDataSource);

            dataSources.dataSourceRemoved.addEventListener(onDataSourceRemoved, routeDataSource);

            // Make Thresholding and XY Plot functionalities available
            that.bumpPlotTasksCounter(1);
            that.bumpThresholdingTasksCounter(1);
        };

        var url = 'resources/data/trajectory.json';
        if (demoId == ROUTES_DEMO_ID) {
            url = 'resources/data/flights.json';
        }

        routeDataSource.loadUrl(url, whenLoaded);
    }

    /**
     * Handles data source removed event. Cleans up any floating panes and
     * hides the d3 plot.
     * @param {DataSourceCollection} dataSourceCollection
     * @param {DataSource} dataSource
     */
    function onDataSourceRemoved (dataSourceCollection, dataSource) {
        if (dataSource instanceof RouteDataSource) {
            dataSourceCollection.dataSourceRemoved.removeEventListener(onDataSourceRemoved, dataSource);

            // Destroy any floating panes
            for (var property in propertiesUis) {
                if (propertiesUis.hasOwnProperty(property)) {
                    var pane = propertiesUis[property].getParent();
                    pane.removeEventListener('mousedown', routeSelectedListener, false);
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
     * Handles flight route objects selected on 3d map.
     * @param {DynamicObj} primitive
     * @param {number} x  The x position of mouse click
     * @param {number} y  The y position of mouse click
     */
    RouteChildController.prototype.handlePrimitivePicked = function(primitive, x, y) {
        var properties = primitive.envProperties;
        if (defined(properties)  && primitive.bdaType == 'FLIGHT_PATH') {
            var routeName = primitive._label._text._value;  // FIXME: only airplane object has label, maybe want to use ID
            var obFloatingPane;
            var propertiesUi = propertiesUis[routeName];
            if (propertiesUi == null) {
                // Create Floating Pane
                var scope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
                obFloatingPane = scope.addFloatingPane(routeName, routeName, 'bda-TitledFloatingPane');

                // Create Floating Pane properties and add them
                propertiesUi = new PropertiesUi(properties);
                obFloatingPane.appendChild(propertiesUi._div);

                obFloatingPane.onmousedown = routeSelectedListener;
                propertiesUis[routeName] = propertiesUi;
            }
            else {
                obFloatingPane = propertiesUi.getParent();
            }

            // Set position and make visible
            var style = "position:absolute;top:"+y+"px;left:"+x+"px; display: block;";
            obFloatingPane.style.cssText = style;
            propertiesUi.setAvailability(primitive.availability);
            obFloatingPane.classList.toggle('selected');

            // Make XY plot visible
            that.hideXyPlot(false);

            // Unselect old previous flight pane
            var plotScope = angular.element(document.getElementById("plot")).scope();
            if (defined(plotScope.currentPlot && propertiesUis[plotScope.currentPlot])) {
                propertiesUis[plotScope.currentPlot].toggleSelected();
            }

            // Update xy plot
            // TODO: How about attaching obsData to floating panel so dont always have to look it up, use for syncclock too!! ...........................................
            var obsData = {};
            obsData['lineData'] = getRouteData(primitive.name, plotScope.parameters);
            obsData['unitsData'] = this.getUnitData(primitive.name, plotScope.parameters, dataSources, RouteDataSource);
            plotScope.changePlot(primitive.name, obsData);
        }
    };

    /**
     * Listens for selected route events.
     * Updates the d3 plot with selected route, and shows the panel as selected.
     * @param {MouseEvent} event
     */
    function routeSelectedListener(event) {
        var scope = angular.element(document.getElementById("plot")).scope();

        // Unselect old current floating pane
        // TODO: what if more than one type of dataSource is plotted, then current floatingPane could belong to other controller
        if (defined(scope.currentPlot && propertiesUis[scope.currentPlot])) {
            propertiesUis[scope.currentPlot].toggleSelected();
        }

        // Set selected route as current plot in xy plot
        var obsData = {};
        obsData['lineData'] = getRouteData(this.id, scope.parameters);
        obsData['unitsData'] = that.getUnitData(this.id, scope.parameters, dataSources, RouteDataSource);
        scope.changePlot(this.id, obsData);

        // Select route floating pane
        this.classList.toggle('selected');
    }

    /**
     * Gets route data for all times in data source.
     * It returns an array of route objects made up of time and the requested
     * parameter data.
     * @param {string} routeName     the route name
     * @param {Array}  parameters    array of parameters that should be included in route data
     */
    function getRouteData(routeName, parameters) {
        var routeData = [];
        var foundRoute = false;

        try {
            for (var i=0; i<dataSources.length; i++) {
                var dataSource = dataSources.get(i);
                if (dataSource instanceof RouteDataSource) {
                    var entityCollection = dataSource.entities;
                    var routeObjects = entityCollection.values;
                    for (var j=0; j<routeObjects.length; j++) {
                        var obj = routeObjects[j];
                        if (defined(obj.name) && obj.name == routeName) {
                            foundRoute = true;
                            if (defined(obj.billboard)) {
                                // Just take data associated with airplane dynamic object
                                var properties = obj.envProperties;
                                var point = {};
                                point['time'] = JulianDate.toDate(obj.availability.get(0).stop).getTime();

                                for (var k=0; k<parameters.length; k++) {
                                    if (properties.hasOwnProperty(parameters[k])) {
                                        point[parameters[k]] = properties[parameters[k]].getValueString();
                                        if (isNaN(point[parameters[k]])) {
                                            point[parameters[k]] = null;
                                        }
                                    }
                                    else {
                                        point[parameters[k]] = null;
                                    }
                                }
                                routeData.push(point);
                            }
                        } else if (foundRoute) {
                            // Since these objects have been sorted by route name, we know we
                            // can break out early when search moves on to next station
                            break;
                        }
                    }
                }
            }
        } catch (ex) {
            console.error("error getting route data for : " + routeName + ' error='+ ex);
        }

        return routeData;
    }

    /**
     * Handles when camera height changes.
     * @param {number} height
     */
    RouteChildController.prototype.handleCameraHeightChanged = function(height) {
        // Do nothing
    };

    /**
     * Syncs clock with the correct time interval.
     * @param {Clock} clock  The Cesium timeline clock
     */
    RouteChildController.prototype.syncClock = function(clock) {
        for (var property in propertiesUis) {
            var pane = propertiesUis[property];
            if (pane.isShowing()) {
                var availability = pane.getAvailability();
                if (!TimeInterval.contains(availability.get(0), clock.currentTime)) {
                    try {
                        // Look for same title and valid availability
                        for (var i=0; i<dataSources.length; i++) {
                            var dataSource = dataSources.get(i);
                            if (dataSource instanceof RouteDataSource) {
                                var entityCollection = dataSource.entities;
                                var entities = entityCollection.values;
                                for (var j=0; j<entities.length; j++) {
                                    var obj = entities[j];
                                    if (defined(obj.envProperties) && defined(obj.billboard)
                                        && obj.name == property && TimeInterval.contains(obj.availability.get(0), clock.currentTime)) {
                                    	pane.setAvailability(obj.availability);
                                        pane.setProperties(obj.envProperties);
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (ex) {
                        console.error("error sync FloatingPanes: " + ex);
                    }
                }
            }
        }
    };

    /**
     * Applies inputted thresholding onto plotted routes.
     * @param {Array} thresholds  Array of selected threshold values per threshold parameter
     */
    RouteChildController.prototype.applyThresholding = function(thresholds) {
        var materials = [];
        try {
            for (var i=0; i<dataSources.length; i++) {
                var dataSource = dataSources.get(i);
                if (dataSource instanceof RouteDataSource) {
                    if (materials.length == 0) {
                        materials = [dataSource.goodMaterial, dataSource.marginalMaterial, dataSource.severeMaterial];
                    }
                    var entityCollection = dataSource.entities;
                    var routes = entityCollection.values;
                    for (var j=0; j<routes.length; j++) {
                            var colorProperty = this.getThresholdColor(routes[j].envProperties, thresholds);
                        if (defined(routes[j]._polyline)) {
                            routes[j]._polyline.material = lookupMaterial(colorProperty);
                        }
                    }

                    // Tell map that object changed by raising event
                    dataSource.changedEvent.raiseEvent(dataSource);
                }
            }
        } catch (ex) {
            console.error("error applying thresholds: " + ex);
        }

        /**
         * Looks up material based on inputted color property.
         * @param {Property} colorProperty
         * @return {ColorMaterialProperty}
         */
        function lookupMaterial(colorProperty) {
            var material = materials[0];
            for (var i=0; i<materials.length; i++) {
                if (materials[i].color.equals(colorProperty)) {
                    material = materials[i];
                    break;
                }
            }

            return material;
        }
    };

    /**
     * Clears thresholding. The route objects are reverted back to default.
     */
    RouteChildController.prototype.clearThresholding = function() {
        try {
            for (var i=0; i<dataSources.length; i++) {
                var dataSource = dataSources.get(i);
                if (dataSource instanceof RouteDataSource) {
                    var entityCollection = dataSource.entities;
                    var routes = entityCollection.values;
                    for (var j=0; j<routes.length; j++) {
                        if (defined(routes[j]. _polyline)) {
                            routes[j]._polyline.material = dataSource.defaultMaterial;
                        }

                        // clear properties in floating panes
                        for (var key in routes[j].envProperties) {
                            var property = routes[j].envProperties[key];
                            if (defined(property.color) && property.color != ChildController.DEFAULT_PROPERTY_COLOR) {
                                var oldColor = property.color;
                                property.color = ChildController.DEFAULT_PROPERTY_COLOR;
                                property.propertyChanged.raiseEvent(property, 'color', property.color, oldColor);
                            }
                        }
                    }

                    // Tell map that object changed by raising event
                    dataSource.changedEvent.raiseEvent(dataSource);
                }
            }
        } catch (ex) {
            console.error("error clearing thresholds: " + ex);
        }
    };

    return RouteChildController;
});