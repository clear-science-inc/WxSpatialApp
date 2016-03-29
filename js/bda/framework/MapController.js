/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Bda/framework/DrawRectangle',
    'Bda/util/Util',
    'Cesium/Core/Cartographic',
    'Cesium/Core/Cartesian3',
    'Cesium/Core/ClockRange',
    'Cesium/Core/Color',
    'Cesium/Core/defined',
    'Cesium/Core/EventHelper',
    'Cesium/Core/JulianDate',
    'Cesium/Core/Math',
    'Cesium/Core/ScreenSpaceEventHandler',
    'Cesium/Core/ScreenSpaceEventType',
    'Cesium/Scene/Billboard',
    'Cesium/Scene/CameraFlightPath',
    'Cesium/Scene/Label',
    'Cesium/Scene/Material',
    'Cesium/Scene/Polyline',
    'Cesium/Scene/PolylineCollection',
    'Cesium/Scene/SceneMode'

], function(
    DrawRectangle,
    Util,
    Cartographic,
    Cartesian3,
    ClockRange,
    Color,
    defined,
    EventHelper,
    JulianDate,
    CesiumMath,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    Billboard,
    CameraFlightPath,
    Label,
    Material,
    Polyline,
    PolylineCollection,
    SceneMode
)
{
    "use strict";


    /** @const */ var MAX_HEIGHT = 7000000;
    /** @const */ var MIN_HEIGHT = 2500000;

    var theViewer;
    var childControllers;
    var primitives;
    var polylines;
    var distancePolyline;

    /**
     * MapController Object. It controls interactions between the BDA UI
     * controls and the Cesium map.
     * @param {Viewer} viewer  The viewer instance
     * @param {ChildController[]} controllers   The array of child controllers
     */
    var MapController = function(viewer, controllers) {
        theViewer = viewer;
        primitives = viewer.scene.primitives;
        childControllers = controllers;
        setupMapListener();
        setupClockListener();
        setupUiListeners();
    };

    /**
     * Handles the mouse click events for BDA objects.
     * @param {Object} event
     */
    var mouseClickListener = function(event) {
        try {
            var ellipsoid = theViewer.scene.globe._ellipsoid;

            var pickedOb;

            var pickedObject = theViewer.scene.pick(event.position);
            if (typeof pickedObject != 'undefined') {
                var pickedPrimitive = pickedObject.primitive;

                if ((pickedPrimitive instanceof Billboard || pickedPrimitive instanceof Label || pickedPrimitive instanceof PointPrimitive) && pickedPrimitive.id) {
                    pickedOb = pickedPrimitive.id;

                    for (var i=0; i<childControllers.length; i++) {
                        childControllers[i].handlePrimitivePicked(pickedOb, event.position.x, event.position.y);
                    }
                }
                else {
                    pickedOb = null;
                }
            }

            // Check for distance
            var utilAndToolsScope = angular.element(document.getElementById('utilAndToolsCtrl')).scope();
            if (utilAndToolsScope.showDistance) {
               var ellipsoid = theViewer.scene.globe._ellipsoid;
               var posPoint = theViewer.scene.camera.pickEllipsoid(event.position, ellipsoid);

               if (utilAndToolsScope.drawing) {
                    utilAndToolsScope.drawing = false;
                }
                else {
                     if (defined(posPoint)) {
                        try {
                            var positions = [posPoint, posPoint];

                            if (!defined(polylines)) {
                                polylines = new PolylineCollection();
                            }

                            if (!defined(distancePolyline)) {
                                distancePolyline = polylines.add({
                                    positions : positions,
                                    material : Material.fromType('Color', {color : Color.ORANGERED})
                                });

                                primitives.add(polylines);
                            }
                            else {
                                distancePolyline.positions = positions;
                            }

                            utilAndToolsScope.drawing = true;
                        } catch (e) {
                            console.error('error: ' + e);
                        }
                    }
                }
            }

        } catch (ex) {
            // Ignore mouseClick
            //console.error("Error handling mouseClick: " + ex);
        }
    };

    /**
     * Listens for map zoom events. Camera height changes when the user zooms
     * in and out on the map. This event processes a change in camera height.
     */
    var zoomListener = function() {
        var ellipsoid = theViewer.scene.globe._ellipsoid;

        var sceneMode = theViewer.scene.globe._mode;
        var camera = theViewer.scene.camera;
        var height;

        if (sceneMode === SceneMode.SCENE3D) {
            height = ellipsoid.cartesianToCartographic(camera.position).height;
        }
        else if (sceneMode === SceneMode.SCENE2D) {
            height =  (camera.frustum.right - camera.frustum.left) * 0.5;
        }
        else { // COLUMBUS_VIEW
            height = camera.position.z;
        }

        for (var i=0; i<childControllers.length; i++) {
            childControllers[i].handleCameraHeightChanged(height);
        }
    };

    /**
     * Handles the mouse moved events.
     * @param {{startPosition: Cartesian2, endPosition: Cartesian2}} event
     */
    var mouseMovedListener = function(event) {
        var scene = theViewer.scene;
        var ellipsoid = theViewer.scene.globe._ellipsoid;
        var posPoint = scene.camera.pickEllipsoid(event.endPosition, ellipsoid);

        var scope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
        if (scope.toolbarService.showLatLon) {
            // Update lat/lon position displayed on map
            if (defined(posPoint)) {
                try {
                    var d = ellipsoid.cartesianToCartographic(posPoint);
                    scope.toolbarService.latLonReadout = CesiumMath.toDegrees(d.latitude).toFixed(2) + ",  " + CesiumMath.toDegrees(d.longitude).toFixed(2);
                }
                catch (e) {
                    scope.toolbarService.latLonReadout = '';
                }
            }
            else {
                scope.toolbarService.latLonReadout = '';
            }
        }

        var utilAndToolsScope = angular.element(document.getElementById('utilAndToolsCtrl')).scope();
        if (utilAndToolsScope.showDistance && utilAndToolsScope.drawing && event.startPosition != event.endPosition) {
            // Update Distance and range in distance panel
            if (defined(posPoint) && defined(distancePolyline)) {
                try {
                    var positions = [distancePolyline._positions[0], posPoint];
                    distancePolyline.positions = positions;
                    utilAndToolsScope.distanceService.setDistance(Cartesian3.distance(positions[0], positions[1]));

                    var heading = angleBetween(positions[0], positions[1]);
                    utilAndToolsScope.distanceService.setHeading(CesiumMath.toDegrees(heading));
                }
                catch (e) {
                    console.error(e);
                }
            }
        }
    };

    /**
     * Computes the angle between 2 geographic positions.
     * @param {Cartesian3} left
     * @paran {Cartesian3} right
     * @return {number} angle in radians
     */
    function angleBetween(left, right) {
        var ellipsoid = theViewer.scene.globe._ellipsoid;
        var pos1 = ellipsoid.cartesianToCartographic(left);
        var pos2 = ellipsoid.cartesianToCartographic(right);

        var dLon = pos2.longitude - pos1.longitude;

        // θ = atan2(sin(Δlong)*cos(lat2), cos(lat1)*sin(lat2) − sin(lat1)*cos(lat2)*cos(Δlong))
        var angle = Math.atan2(Math.sin(dLon) * Math.cos(pos2.latitude),
            Math.cos(pos1.latitude) * Math.sin(pos2.latitude) - Math.sin(pos1.latitude) * Math.cos(pos2.latitude) * Math.cos(dLon));
        return angle;
    }

    /**
     * Sets up the map listener. Listen for selected BDA objects.
     */
    function setupMapListener() {
        var handler = new ScreenSpaceEventHandler(theViewer.canvas);
        handler.setInputAction(mouseClickListener, ScreenSpaceEventType.LEFT_CLICK);
        handler.setInputAction(zoomListener, ScreenSpaceEventType.WHEEL);
        handler.setInputAction(zoomListener, ScreenSpaceEventType.RIGHT_UP);
        handler.setInputAction(zoomListener, ScreenSpaceEventType.PINCH_END);;
        handler.setInputAction(mouseMovedListener, ScreenSpaceEventType.MOUSE_MOVE);
    }

    /**
     * Sets up clock listener.
     */
    function setupClockListener() {
        var eventHelper = new EventHelper();
        eventHelper.add(theViewer.cesiumWidget.clock.onTick, syncClock);

        /**
         * Updates current time in the XyPlotCtrl and its child controllers.
         * @param {Clock} clock  the Cesium timeline clock
         */
        function syncClock(clock) {
            var scope = angular.element(document.getElementById('plot')).scope();
            scope.currentTime = JulianDate.toDate(clock.currentTime).getTime();
            scope.$apply();

            for (var i=0; i<childControllers.length; i++) {
                childControllers[i].syncClock(clock);
            }
        }
    }

    /**
     * Sets up to listen to ui events in the angular code.
     */
    function setupUiListeners() {
        // Listen for new aoi selected
        var scope = angular.element(document.getElementById('utilAndToolsCtrl')).scope();
        scope.$watch('aoiToiService.areaOfInterest', function(newVal, oldVal) {
            if (newVal !== oldVal) {
                zoomToAoi(newVal);
            }
        });

        scope.$watch('aoiToiService.selectedTimePeriod', function(newVal, oldVal) {
            if (newVal) {
                // Update TimeLine and clock
                if (defined(theViewer.timeline)) {
                    theViewer.clock.startTime = JulianDate.fromDate(scope.aoiToiService.startTime);
                    theViewer.clock.stopTime = JulianDate.fromDate(scope.aoiToiService.endTime);
                    theViewer.clock.clockRange = ClockRange.LOOP_STOP;
                    var currentTime = theViewer.clock.currentTime;

                    // If current time is outside range, reset it to start time
                    if (JulianDate.compare(currentTime, theViewer.clock.startTime) < 0 ||
                        JulianDate.compare(theViewer.clock.stopTime, currentTime) < 0) {
                        theViewer.clock.currentTime = theViewer.clock.startTime;
                    }
                    theViewer.timeline.updateFromClock();
                    theViewer.timeline.zoomTo(theViewer.clock.startTime, theViewer.clock.stopTime);
                }
            }
        });

        // Listen for draw aoi selected
        scope.$watch('aoiToiService.toggledDrawAoi', function(newVal, oldVal) {
            if (newVal !== oldVal) {
                drawAoi();
            }
        });

        // Listen for distance
        scope.$watch('showDistance', function(newVal, oldVal) {
            if (newVal !== oldVal) {
                var cesiumContainer = document.getElementById('cesiumContainer');
                if (newVal) {
                    cesiumContainer.style.cursor='crosshair';
                }
                else {
                    cesiumContainer.style.cursor='default';
                }
            }
        });

        // Listen for clear distance
        scope.$watch('distanceService.toggleClear', function(newVal, oldVal) {
            if (newVal !== oldVal && defined(polylines) && polylines.contains(distancePolyline)) {
                polylines.remove(distancePolyline);
                distancePolyline = undefined;
            }
        });

        // Listen for apply/clear thresholding user input
        var bdaScope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
        bdaScope.$watch('thresholdingService.thresholdingApplied', function(newVal, oldVal) {
            if (newVal !== oldVal) {
                if (newVal > 0) {
                    applyThresholding(bdaScope.getThresholdingParameters());
                }
                else {
                    clearThresholding();
                }
            }
        });
    }

    /**
     * Applies inputted thresholding onto BDA plotted objects.
     * @param {Array} thresholds  array of selected threshold values per threshold parameter
     */
    function applyThresholding(thresholds) {
        for (var i=0; i<childControllers.length; i++) {
            childControllers[i].applyThresholding(thresholds);
        }
    }

    /**
     * Tells child controllers to clear thresholding.
     */
    function clearThresholding() {
        for (var i=0; i<childControllers.length; i++) {
            childControllers[i].clearThresholding();
        }
    }

    /**
     * Enables drawing an area of interest on the map.
     */
    function drawAoi() {

        /**
         * Updates the selected aoi and flies to the drawn rectangle.
         * @param {Rectangle} rectangle
         */
        var drawAoiFinishedHandler = function(rectangle) {
           var aoi = {
                west: CesiumMath.toDegrees(rectangle.west),
                south: CesiumMath.toDegrees(rectangle.south),
                east: CesiumMath.toDegrees(rectangle.east),
                north: CesiumMath.toDegrees(rectangle.north)
            };

            var scope = angular.element(document.getElementById('utilAndToolsCtrl')).scope();
            scope.aoiToiService.areaOfInterest = aoi.west + ',' + aoi.south + ',' + aoi.east + ',' + aoi.north;

            flyToAoi(aoi);
        };

        // Start draw interaction on map for user
        var drawRectangle = new DrawRectangle(theViewer.scene, drawAoiFinishedHandler);
        drawRectangle.start();
    }

    /**
     * Zooms to the area of interest.
     * @param {String} areaOfInterest
     */
    function zoomToAoi(areaOfInterest) {

        var aoi = Util.makeAoi(areaOfInterest);
        flyToAoi(aoi);
    }

    /**
     * Flies to the area of interest.
     * @param {{north: number, west: number, east: number, south: number}} aoi
     */
    function flyToAoi(aoi) {

        // fly to center of new aoi
        var center = computeAoiCenter(aoi);

        // compute width of aoi and use it for camera distance
        var westCart = new Cartographic.fromDegrees(aoi.west, center.longitude);
        var eastCart = new Cartographic.fromDegrees(aoi.east, center.longitude);
        var ellipsoid = theViewer.scene.globe._ellipsoid;
        var xyPoints = ellipsoid.cartographicArrayToCartesianArray([westCart, eastCart]);
        var distance = Math.abs(xyPoints[0].x - xyPoints[1].x);
        if (distance == 0) {
            distance = MAX_HEIGHT;
        }
        distance = Math.min(MAX_HEIGHT, distance);
        distance = Math.max(MIN_HEIGHT, distance);

        var centerCart = new Cartographic.fromDegrees(center.longitude,
             center.latitude, distance);

        var scene = theViewer.scene;

        scene.camera.flyTo({
            destination : ellipsoid.cartographicToCartesian(centerCart),
            duration: 4,
            complete : function() {
                //console.log(" --- onComplete .. FLIGHT .. ---");
            }
        });

        /**
         * Computes the center of an AOI.
         * @param {{north: number, west: number, east: number, south: number}} aoi
         * @return {{latitude: number, longitude: number}} center point
         */
        function computeAoiCenter(aoi) {
            var lat = 0;
            var lon = 0;

            if (aoi.north == 90 && aoi.south == -90 && aoi.west == -180 && aoi.east == 180) {
                // Make Gulf of Mexico center for whole world
                lat = 25;
                lon = -90;
            }
            else {
                lat = Util.addjs(aoi.south,  (aoi.north - aoi.south)/2);

                // In same hemisphere use the average longitude
                if ((aoi.west < 0 && aoi.east < 0) || (aoi.west > 0 && aoi.east > 0)) {
                    lon = Util.addjs(aoi.west, aoi.east) / 2.0;
                }
                else {
                    // Spans the prime meridian
                    if (aoi.west < 0 ) {
                        var centerLonDist = Util.addjs(aoi.east, Math.abs(aoi.west)) / 2;
                        lon = Util.addjs(aoi.west, centerLonDist);
                    } else {  // use the international date line
                        var sphericalEast = Util.addjs(aoi.east, 360.0);
                        lon = Util.addjs(aoi.west, sphericalEast) / 2.0;
                        if (lon > 180) {
                            lon -= 360;
                        }
                    }
                }
            }

            var center = Util.makePosition(lat, lon);
            return center;
        }
    }

    // TODO: remove listeners

    return MapController;
});