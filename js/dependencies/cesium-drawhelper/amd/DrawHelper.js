/**
 * Created by thomas on 9/01/14.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * (c) www.geocento.com
 * www.metaaps.com
 *
 */

/**
 * Modified by General Dynamics Information Technology (2014) from DrawHelper.js
 * to be its own AMD module.
 */


define([
    'Cesium/Core/Cartesian3',    
    'Cesium/Core/CircleGeometry',
    'Cesium/Core/CircleOutlineGeometry',    
    'Cesium/Core/Color',
    'Cesium/Core/defined',
    'Cesium/Core/destroyObject',
    'Cesium/Core/DeveloperError',    
    'Cesium/Core/Ellipsoid',    
    'Cesium/Core/EllipsoidGeodesic',
    'Cesium/Core/Math',
    'Cesium/Core/Rectangle',    
    'Cesium/Core/ScreenSpaceEventHandler',
    'Cesium/Core/ScreenSpaceEventType',
    'Cesium/Scene/Billboard',    
    'Cesium/Scene/EllipsoidSurfaceAppearance',
    'Cesium/Scene/PolylineMaterialAppearance',    
    'Cesium/Scene/Material',   
    'Cesium/Scene/RectanglePrimitive',    
    'DrawHelper/BillboardGroup',
    'DrawHelper/CirclePrimitive',
    'DrawHelper/DrawHelperWidget',
    'DrawHelper/EllipsePrimitive',
    'DrawHelper/ExtentPrimitive',
    'DrawHelper/PolygonPrimitive',
    'DrawHelper/PolylinePrimitive'
], function(
    Cartesian3,    
    CircleGeometry,
    CircleOutlineGeometry,
    Color,    
    defined,
    destroyObject,
    DeveloperError,
    Ellipsoid,
    EllipsoidGeodesic,
    CesiumMath,
    Rectangle,    
    ScreenSpaceEventHandler, 
    ScreenSpaceEventType,    
    Billboard,    
    EllipsoidSurfaceAppearance,
    PolylineMaterialAppearance,    
    Material,
    RectanglePrimitive,
    BillboardGroup,
    CirclePrimitive,
    DrawHelperWidget,
    EllipsePrimitive,
    ExtentPrimitive,
    PolygonPrimitive,
    PolylinePrimitive)
{
    "use strict";

    // static variables
    var ellipsoid = Ellipsoid.WGS84;

    // constructor
    var DrawHelper = function(cesiumWidget) {    
        this._scene = cesiumWidget.scene;
        this._tooltip = createTooltip(cesiumWidget.container);
        this._surfaces = [];

        this.initialiseHandlers();

        this.enhancePrimitives();
        this.ignoreMouseMovements = false;

        var material = Material.fromType(Material.ColorType);
        material.uniforms.color = new Color(1.0, 1.0, 0.0, 0.5);
    
        var defaultShapeOptions = {
            ellipsoid: ellipsoid,
            textureRotationAngle: 0.0,
            height: 0.0,
            asynchronous: true,
            show: true,
            debugShowBoundingVolume: false
        };
    
        this._defaultSurfaceOptions = copyOptions(defaultShapeOptions, {
            appearance: new EllipsoidSurfaceAppearance({
                aboveGround : false
            }),
            material : material,
            granularity: Math.PI / 180.0
        });
    
        this._defaultPolygonOptions = copyOptions(defaultShapeOptions, {});
        this._defaultExtentOptions = copyOptions(defaultShapeOptions, {});
        this._defaultCircleOptions = copyOptions(defaultShapeOptions, {});
        this._defaultEllipseOptions = copyOptions(this._defaultSurfaceOptions, {rotation: 0});
    
        this._defaultPolylineOptions = copyOptions(defaultShapeOptions, {
            width: 5,
            geodesic: true,
            granularity: 10000,
            appearance: new PolylineMaterialAppearance({
                aboveGround : false
            }),
            material : material
        });
        
        this._defaultBillboard = {
            iconUrl: "js/dependencies/cesium-drawhelper/img/dragIcon.png",
            shiftX: 0,
            shiftY: 0
        };
    
        this._dragBillboard = {
            iconUrl: "js/dependencies/cesium-drawhelper/img/dragIcon.png",
            shiftX: 0,
            shiftY: 0
        };
    
        this._dragHalfBillboard = {
            iconUrl: "js/dependencies/cesium-drawhelper/img/dragIconLight.png",
            shiftX: 0,
            shiftY: 0
        };
    };

    DrawHelper.prototype.initialiseHandlers = function() {
        var scene = this._scene;
        var _self = this;
        // scene events
        var handler = new ScreenSpaceEventHandler(scene.canvas);
        function callPrimitiveCallback(name, position) {
            if(_self._handlersMuted == true) return;
            var pickedObject = scene.pick(position);
            if(pickedObject && pickedObject.primitive && pickedObject.primitive[name]) {
                pickedObject.primitive[name](position);
            }
        }
        handler.setInputAction(
            function (movement) {
                callPrimitiveCallback('leftClick', movement.position);
        }, ScreenSpaceEventType.LEFT_CLICK);
        handler.setInputAction(
            function (movement) {
                callPrimitiveCallback('leftDoubleClick', movement.position);
            }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        var mouseOutObject;
        handler.setInputAction(
            function (movement) {
                if(_self._handlersMuted == true) return;
                var pickedObject = scene.pick(movement.endPosition);
                if(mouseOutObject && (!pickedObject || mouseOutObject != pickedObject.primitive)) {
                    !(mouseOutObject.isDestroyed && mouseOutObject.isDestroyed()) && mouseOutObject.mouseOut(movement.endPosition);
                    mouseOutObject = null;
                }
                if(pickedObject && pickedObject.primitive) {
                    pickedObject = pickedObject.primitive;
                    if(pickedObject.mouseOut) {
                        mouseOutObject = pickedObject;
                    }
                    if(pickedObject.mouseMove) {
                        pickedObject.mouseMove(movement.endPosition);
                    }
                }
            }, ScreenSpaceEventType.MOUSE_MOVE);
        handler.setInputAction(
            function (movement) {
                callPrimitiveCallback('leftUp', movement.position);
            }, ScreenSpaceEventType.LEFT_UP);
        handler.setInputAction(
            function (movement) {
                callPrimitiveCallback('leftDown', movement.position);
            }, ScreenSpaceEventType.LEFT_DOWN);
    };

    DrawHelper.prototype.setListener = function(primitive, type, callback) {
        primitive[type] = callback;
    };

    DrawHelper.prototype.muteHandlers = function(muted) {
        this._handlersMuted = muted;
    };

    // register event handling for an editable shape
    // shape should implement setEditMode and setHighlighted
    DrawHelper.prototype.registerEditableShape = function(surface) {
        var _self = this;

        // handlers for interactions
        // highlight polygon when mouse is entering
        setListener(surface, 'mouseMove', function(position) {
            surface.setHighlighted(true);
            if(!surface._editMode) {
                _self._tooltip.showAt(position, "Click to edit this shape");
            }
        });
        // hide the highlighting when mouse is leaving the polygon
        setListener(surface, 'mouseOut', function(position) {
            surface.setHighlighted(false);
            _self._tooltip.setVisible(false);
        });
        setListener(surface, 'leftClick', function(position) {
            surface.setEditMode(true);
        });
    };

    DrawHelper.prototype.startDrawing = function(cleanUp) {
        // undo any current edit of shapes
        this.disableAllEditMode();
        // check for cleanUp first
        if(this.editCleanUp) {
            this.editCleanUp();
        }
        this.editCleanUp = cleanUp;
        this.muteHandlers(true);
    };

    DrawHelper.prototype.stopDrawing = function() {
        // check for cleanUp first
        if(this.editCleanUp) {
            this.editCleanUp();
            this.editCleanUp = null;
        }
        this.muteHandlers(false);
    };

    // make sure only one shape is highlighted at a time
    DrawHelper.prototype.disableAllHighlights = function() {
        this.setHighlighted(undefined);
    };

    DrawHelper.prototype.setHighlighted = function(surface) {
        if(this._highlightedSurface && !this._highlightedSurface.isDestroyed() && this._highlightedSurface != surface) {
            this._highlightedSurface.setHighlighted(false);
        }
        this._highlightedSurface = surface;
    };

    DrawHelper.prototype.disableAllEditMode = function() {
        this.setEdited(undefined);
    };

    DrawHelper.prototype.setEdited = function(surface) {
        if(this._editedSurface && !this._editedSurface.isDestroyed()) {
            this._editedSurface.setEditMode(false);
        }
        this._editedSurface = surface;
    };

    DrawHelper.prototype.addToolbar = function(container, options) {
        options = copyOptions(options, {container: container});
        return new DrawHelperWidget(this, options);
    };
    

    DrawHelper.prototype.startDrawingMarker = function(options) {

        var options = copyOptions(options, this._defaultBillboard);

        this.startDrawing(
            function() {
                if (markers) {
                    markers.remove();
                }
                mouseHandler.destroy();
                tooltip.setVisible(false);
            }
        );

        var _self = this;
        var scene = this._scene;
        var primitives = scene.primitives;
        var tooltip = this._tooltip;

        var markers = new BillboardGroup(this, options);

        var mouseHandler = new ScreenSpaceEventHandler(scene.canvas);

        // Now wait for start
        mouseHandler.setInputAction(function(movement) {
            if(movement.position != null && !_self.ignoreMouseMovements) {
                var cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
                if (cartesian) {
                    markers.addBillboard(cartesian);
                    _self.stopDrawing();
                    options.callback(cartesian);
                }
            }
        }, ScreenSpaceEventType.LEFT_CLICK);

        mouseHandler.setInputAction(function(movement) {
            var position = movement.endPosition;
            if(position != null && !_self.ignoreMouseMovements) {
                var cartesian = scene.camera.pickEllipsoid(position, ellipsoid);
                if (cartesian) {
                    tooltip.showAt(position, "<p>Click to add your marker. Position is: </p>" + getDisplayLatLngString(ellipsoid.cartesianToCartographic(cartesian)));
                } else {
                    tooltip.showAt(position, "<p>Click on the globe to add your marker.</p>");
                }
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

    };

    DrawHelper.prototype.startDrawingPolygon = function(options) {
        var options = copyOptions(options, this._defaultSurfaceOptions);
        this.startDrawingPolyshape(true, options);
    };

    DrawHelper.prototype.startDrawingPolyline = function(options) {
        var options = copyOptions(options, this._defaultPolylineOptions);
        this.startDrawingPolyshape(false, options);
    };
    
    DrawHelper.prototype.enhancePrimitives = function() {

        var drawHelper = this;

        Billboard.prototype.setEditable = function() {

            if(this._editable) {
                return;
            }

            this._editable = true;

            var billboard = this;

            var _self = this;

            function enableRotation(enable) {
                drawHelper._scene.screenSpaceCameraController.enableRotate = enable;
            }

            setListener(billboard, 'leftDown', function(position) {
                // TODO - start the drag handlers here
                // create handlers for mouseOut and leftUp for the billboard and a mouseMove
                function onDrag(position) {
                    billboard.position = position;
                    if (billboard._label) {
                        // Move associated label too
                        billboard._label.position = position;
                    }
                    _self.executeListeners({name: 'drag', positions: position});
                }
                function onDragEnd(position) {
                    handler.destroy();
                    enableRotation(true);
                    _self.executeListeners({name: 'dragEnd', positions: position});
                }

                var handler = new ScreenSpaceEventHandler(drawHelper._scene.canvas);

                handler.setInputAction(function(movement) {
                    var cartesian = drawHelper._scene.camera.pickEllipsoid(movement.endPosition, ellipsoid);
                    if (cartesian) {
                        onDrag(cartesian);
                    } else {
                        onDragEnd(cartesian);
                    }
                }, ScreenSpaceEventType.MOUSE_MOVE);

                handler.setInputAction(function(movement) {
                    onDragEnd(drawHelper._scene.camera.pickEllipsoid(movement.position, ellipsoid));
                }, ScreenSpaceEventType.LEFT_UP);

                enableRotation(false);

            });

            enhanceWithListeners(billboard);

        };
        
        /**
         * Associates a label with a billboard.
         * @param {Label} label
         */
        Billboard.prototype.setLabel = function(label) {
            this._label = label;
        };

        
        function setHighlighted(highlighted) {

            var scene = drawHelper._scene;

            // if no change
            // if already highlighted, the outline polygon will be available
            if(this._highlighted && this._highlighted == highlighted) {
                return;
            }
            // disable if already in edit mode
            if(this._editMode === true) {
                return;
            }
            this._highlighted = highlighted;
            // highlight by creating an outline polygon matching the polygon points
            if(highlighted) {
                // make sure all other shapes are not highlighted
                drawHelper.setHighlighted(this);
                this._strokeColor = this.strokeColor;
                this.setStrokeStyle(Color.fromCssColorString('white'), this.strokeWidth);
            } else {
                if(this._strokeColor) {
                    this.setStrokeStyle(this._strokeColor, this.strokeWidth);
                } else {
                    this.setStrokeStyle(undefined, undefined);
                }
            }
        }

        function setEditMode(editMode) {
            // if no change
            if(this._editMode == editMode) {
                return;
            }
            // make sure all other shapes are not in edit mode before starting the editing of this shape
            drawHelper.disableAllHighlights();
            // display markers
            if(editMode) {
                var scene = drawHelper._scene;
                var _self = this;
                // create the markers and handlers for the editing
                if(this._markers == null) {
                    var markers = new BillboardGroup(drawHelper, drawHelper._dragBillboard);
                    var editMarkers = new BillboardGroup(drawHelper, drawHelper._dragHalfBillboard);
                    var handleMarkerChanges = {
                        dragHandlers: {
                            onDrag: function(index, position) {
                                _self.positions[index] = position;
                                updateHalfMarkers(index, _self.positions);
                                _self._createPrimitive = true;
                            },
                            onDragEnd: function(index, position) {
                                _self._createPrimitive = true;
                                onEdited();
                            }
                        },
                        onDoubleClick: function(index) {
                            if(_self.positions.length < 4) {
                                return;
                            }
                            // remove the point and the corresponding markers
                            _self.positions.splice(index, 1);
                            _self._createPrimitive = true;
                            markers.removeBillboard(index);
                            editMarkers.removeBillboard(index);
                            updateHalfMarkers(index, _self.positions);
                            onEdited();
                        },
                        tooltip: function() {
                            if(_self.positions.length > 3) {
                                return "Double click to remove this point";
                            }
                        }
                    };
                    // add billboards and keep an ordered list of them for the polygon edges
                    markers.addBillboards(_self.positions, handleMarkerChanges);
                    this._markers = markers;
                    var halfPositions = [];
                    var index = 0;
                    var length = _self.positions.length + (this.isPolygon ? 0 : -1);
                    for(; index < length; index++) {
                        halfPositions.push(calculateHalfMarkerPosition(index));
                    }
                    var handleEditMarkerChanges = {
                        dragHandlers: {
                            onDragStart: function(index, position) {
                                // add a new position to the polygon but not a new marker yet
                                this.index = index + 1;
                                _self.positions.splice(this.index, 0, position);
                                _self._createPrimitive = true;
                            },
                            onDrag: function(index, position) {
                                _self.positions[this.index] = position;
                                _self._createPrimitive = true;
                            },
                            onDragEnd: function(index, position) {
                                // create new sets of makers for editing
                                markers.insertBillboard(this.index, position, handleMarkerChanges);
                                editMarkers.getBillboard(this.index - 1).position = calculateHalfMarkerPosition(this.index - 1);
                                editMarkers.insertBillboard(this.index, calculateHalfMarkerPosition(this.index), handleEditMarkerChanges);
                                _self._createPrimitive = true;
                                onEdited();
                            }
                        },
                        tooltip: function() {
                            return "Drag to create a new point";
                        }
                    };
                    editMarkers.addBillboards(halfPositions, handleEditMarkerChanges);
                    this._editMarkers = editMarkers;
                    // add a handler for clicking in the globe
                    this._globeClickhandler = new ScreenSpaceEventHandler(scene.canvas);
                    this._globeClickhandler.setInputAction(
                        function (movement) {
                            var pickedObject = scene.pick(movement.position);
                            if(!(pickedObject && pickedObject.primitive)) {
                                _self.setEditMode(false);
                            }
                        }, ScreenSpaceEventType.LEFT_CLICK);

                    // set on top of the polygon
                    markers.setOnTop();
                    editMarkers.setOnTop();
                }
                this._editMode = true;
            } else {
                if(this._markers != null) {
                    this._markers.remove();
                    this._editMarkers.remove();
                    this._markers = null;
                    this._editMarkers = null;
                    this._globeClickhandler.destroy();
                }
                this._editMode = false;
            }
            
            // function for updating the edit markers around a certain point
            function updateHalfMarkers(index, positions) {
                // update the half markers before and after the index
                var editIndex = index - 1 < 0 ? positions.length - 1 : index - 1;
                if(editIndex < editMarkers.countBillboards()) {
                    editMarkers.getBillboard(editIndex).position = calculateHalfMarkerPosition(editIndex);
                }
                editIndex = index;
                if(editIndex < editMarkers.countBillboards()) {
                    editMarkers.getBillboard(editIndex).position = calculateHalfMarkerPosition(editIndex);
                }
            }
            function onEdited() {
                _self.executeListeners({name: 'onEdited', positions: _self.positions});
            }

            function calculateHalfMarkerPosition(index) {
                var positions = _self.positions;
                return ellipsoid.cartographicToCartesian(
                    new EllipsoidGeodesic(ellipsoid.cartesianToCartographic(positions[index]),
                        ellipsoid.cartesianToCartographic(positions[index < positions.length - 1 ? index + 1 : 0])).
                        interpolateUsingFraction(0.5)
                );
            }
        }

        PolylinePrimitive.prototype.setEditable = function() {

            if(this.setEditMode) {
                return;
            }

            var polyline = this;
            polyline.isPolygon = false;
            polyline.asynchronous = false;

            drawHelper.registerEditableShape(polyline);

            polyline.setEditMode = setEditMode;

            var originalWidth = this.width;

            polyline.setHighlighted = function(highlighted) {
                // disable if already in edit mode
                if(this._editMode === true) {
                    return;
                }
                if(highlighted) {
                    drawHelper.setHighlighted(this);
                    this.setWidth(originalWidth * 2);
                } else {
                    this.setWidth(originalWidth);
                }
            };

            polyline.getExtent = function() {
                return Cesium.Extent.fromCartographicArray(ellipsoid.cartesianArrayToCartographicArray(this.positions));
            };

            enhanceWithListeners(polyline);

            polyline.setEditMode(false);

        };

        PolygonPrimitive.prototype.setEditable = function() {

            var polygon = this;
            polygon.asynchronous = false;

            var scene = drawHelper._scene;

            drawHelper.registerEditableShape(polygon);

            polygon.setEditMode = setEditMode;

            polygon.setHighlighted = setHighlighted;

            enhanceWithListeners(polygon);

            polygon.setEditMode(false);

        };

        ExtentPrimitive.prototype.setEditable = function() {

            if(this.setEditMode) {
                return;
            }

            var extent = this;
            var scene = drawHelper._scene;

            drawHelper.registerEditableShape(extent);
            extent.asynchronous = false;

            extent.setEditMode = function(editMode) {
                // if no change
                if(this._editMode == editMode) {
                    return;
                }
                drawHelper.disableAllHighlights();
                // display markers
                if(editMode) {
                    // make sure all other shapes are not in edit mode before starting the editing of this shape
                    drawHelper.setEdited(this);
                    // create the markers and handlers for the editing
                    if(this._markers == null) {
                        var markers = new BillboardGroup(drawHelper, drawHelper._dragBillboard);
                        var handleMarkerChanges = {
                            dragHandlers: {
                                onDrag: function(index, position) {
                                    var corner = markers.getBillboard((index + 2) % 4).position;
                                    extent.setExtent(getExtent(ellipsoid.cartesianToCartographic(corner), ellipsoid.cartesianToCartographic(position)));
                                    markers.updateBillboardsPositions(getExtentCorners(extent.extent));
                                },
                                onDragEnd: function(index, position) {
                                    onEdited();
                                }
                            },
                            tooltip: function() {
                                return "Drag to change the corners of this extent";
                            }
                        };
                        markers.addBillboards(getExtentCorners(extent.extent), handleMarkerChanges);
                        this._markers = markers;
                        // add a handler for clicking in the globe
                        this._globeClickhandler = new ScreenSpaceEventHandler(scene.canvas);
                        this._globeClickhandler.setInputAction(
                            function (movement) {
                                var pickedObject = scene.pick(movement.position);
                                // disable edit if pickedobject is different or not an object
                                if(!(pickedObject && !pickedObject.isDestroyed() && pickedObject.primitive)) {
                                    extent.setEditMode(false);
                                }
                            }, ScreenSpaceEventType.LEFT_CLICK);

                        // set on top of the polygon
                        markers.setOnTop();
                    }
                    this._editMode = true;
                } else {
                    if(this._markers != null) {
                        this._markers.remove();
                        this._markers = null;
                        this._globeClickhandler.destroy();
                    }
                    this._editMode = false;
                }
            };

            extent.setHighlighted = setHighlighted;

            enhanceWithListeners(extent);

            extent.setEditMode(false);

            function onEdited() {
                extent.executeListeners({name: 'onEdited', extent: extent.extent});
            }
        };

        EllipsePrimitive.prototype.setEditable = function() {

            if(this.setEditMode) {
                return;
            }

            var ellipse = this;
            var scene = drawHelper._scene;

            ellipse.asynchronous = false;

            drawHelper.registerEditableShape(ellipse);

            ellipse.setEditMode = function(editMode) {
                // if no change
                if(this._editMode == editMode) {
                    return;
                }
                drawHelper.disableAllHighlights();
                // display markers
                if(editMode) {
                    // make sure all other shapes are not in edit mode before starting the editing of this shape
                    drawHelper.setEdited(this);
                    var _self = this;
                    // create the markers and handlers for the editing
                    if(this._markers == null) {
                        var markers = new BillboardGroup(drawHelper, drawHelper._dragBillboard);
                        var handleMarkerChanges = {
                            dragHandlers: {
                                onDrag: function(index, position) {
                                    var distance = Cartesian3.distance(ellipse.getCenter(), position);
                                    if(index%2 == 0) {
                                        ellipse.setSemiMajorAxis(distance);
                                    } else {
                                        ellipse.setSemiMinorAxis(distance);
                                    }
                                    markers.updateBillboardsPositions(getMarkerPositions());
                                },
                                onDragEnd: function(index, position) {
                                    onEdited();
                                }
                            },
                            tooltip: function() {
                                return "Drag to change the excentricity and radius";
                            }
                        };
                        markers.addBillboards(getMarkerPositions(), handleMarkerChanges);
                        this._markers = markers;
                        // add a handler for clicking in the globe
                        this._globeClickhandler = new ScreenSpaceEventHandler(scene.canvas);
                        this._globeClickhandler.setInputAction(
                            function (movement) {
                                var pickedObject = scene.pick(movement.position);
                                if(!(pickedObject && pickedObject.primitive)) {
                                    _self.setEditMode(false);
                                }
                            }, ScreenSpaceEventType.LEFT_CLICK);

                        // set on top of the polygon
                        markers.setOnTop();
                    }
                    this._editMode = true;
                } else {
                    if(this._markers != null) {
                        this._markers.remove();
                        this._markers = null;
                        this._globeClickhandler.destroy();
                    }
                    this._editMode = false;
                }
                
                function getMarkerPositions() {
                    return Cesium.Shapes.computeEllipseBoundary(ellipsoid, ellipse.getCenter(), ellipse.getSemiMajorAxis(), ellipse.getSemiMinorAxis(), ellipse.getRotation() + Math.PI / 2, Math.PI / 2.0).splice(0, 4);
                }
                function onEdited() {
                    ellipse.executeListeners({name: 'onEdited', center: ellipse.getCenter(), semiMajorAxis: ellipse.getSemiMajorAxis(), semiMinorAxis: ellipse.getSemiMinorAxis(), rotation: 0});
                }
            };

            ellipse.setHighlighted = setHighlighted;

            enhanceWithListeners(ellipse);

            ellipse.setEditMode(false);
        };

        CirclePrimitive.prototype.getCircleCartesianCoordinates = function (granularity) {
            var geometry = CircleOutlineGeometry.createGeometry(new CircleOutlineGeometry({ellipsoid: ellipsoid, center: this.getCenter(), radius: this.getRadius(), granularity: granularity}));
            var count = 0, value, values = [];
            for(; count < geometry.attributes.position.values.length; count+=3) {
                value = geometry.attributes.position.values;
                values.push(new Cartesian3(value[count], value[count + 1], value[count + 2]));
            }
            return values;
        };

        CirclePrimitive.prototype.setEditable = function() {

            if(this.setEditMode) {
                return;
            }

            var circle = this;
            var scene = drawHelper._scene;

            circle.asynchronous = false;

            drawHelper.registerEditableShape(circle);

            circle.setEditMode = function(editMode) {
                // if no change
                if(this._editMode == editMode) {
                    return;
                }
                drawHelper.disableAllHighlights();
                // display markers
                if(editMode) {
                    // make sure all other shapes are not in edit mode before starting the editing of this shape
                    drawHelper.setEdited(this);
                    var _self = this;
                    // create the markers and handlers for the editing
                    if(this._markers == null) {
                        var markers = new BillboardGroup(drawHelper, drawHelper._dragBillboard);
                        var handleMarkerChanges = {
                            dragHandlers: {
                                onDrag: function(index, position) {
                                    circle.setRadius(Cartesian3.distance(circle.getCenter(), position));
                                    markers.updateBillboardsPositions(getMarkerPositions());
                                },
                                onDragEnd: function(index, position) {
                                    onEdited();
                                }
                            },
                            tooltip: function() {
                                return "Drag to change the radius";
                            }
                        };
                        markers.addBillboards(getMarkerPositions(), handleMarkerChanges);
                        this._markers = markers;
                        // add a handler for clicking in the globe
                        this._globeClickhandler = new ScreenSpaceEventHandler(scene.canvas);
                        this._globeClickhandler.setInputAction(
                            function (movement) {
                                var pickedObject = scene.pick(movement.position);
                                if(!(pickedObject && pickedObject.primitive)) {
                                    _self.setEditMode(false);
                                }
                            }, ScreenSpaceEventType.LEFT_CLICK);

                        // set on top of the polygon
                        markers.setOnTop();
                    }
                    this._editMode = true;
                } else {
                    if(this._markers != null) {
                        this._markers.remove();
                        this._markers = null;
                        this._globeClickhandler.destroy();
                    }
                    this._editMode = false;
                }
                function getMarkerPositions() {
                    return _self.getCircleCartesianCoordinates(CesiumMath.PI_OVER_TWO);
                }
                function onEdited() {
                    circle.executeListeners({name: 'onEdited', center: circle.getCenter(), radius: circle.getRadius()});
                }
            };

            circle.setHighlighted = setHighlighted;

            enhanceWithListeners(circle);

            circle.setEditMode(false);
        };

    };
    
    DrawHelper.prototype.startDrawingPolyshape = function(isPolygon, options) {

        this.startDrawing(
            function() {
                primitives.remove(poly);
                markers.remove();
                mouseHandler.destroy();
                tooltip.setVisible(false);
            }
        );

        var _self = this;
        var scene = this._scene;
        var primitives = scene.primitives;
        var tooltip = this._tooltip;

        var minPoints = isPolygon ? 3 : 2;
        var poly;
        if(isPolygon) {
            poly = new PolygonPrimitive(options, this._defaultSurfaceOptions);
        } else {
            poly = new PolylinePrimitive(options, this._defaultPolylineOptions);
        }
        poly.asynchronous = false;
        primitives.add(poly);

        var positions = [];
        var markers = new BillboardGroup(this, this._defaultBillboard);

        var mouseHandler = new ScreenSpaceEventHandler(scene.canvas);

        // Now wait for start
        mouseHandler.setInputAction(function(movement) {
            if(movement.position != null) {
                var cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
                if (cartesian) {
                    // first click
                    if(positions.length == 0) {
                        positions.push(cartesian.clone());
                        markers.addBillboard(positions[0]);
                    }
                    if(positions.length >= minPoints) {
                        poly.positions = positions;
                        poly._createPrimitive = true;
                    }
                    // add new point to polygon
                    // this one will move with the mouse
                    positions.push(cartesian);
                    // add marker at the new position
                    markers.addBillboard(cartesian);
                }
            }
        }, ScreenSpaceEventType.LEFT_CLICK);

        mouseHandler.setInputAction(function(movement) {
            var position = movement.endPosition;
            if(position != null && !_self.ignoreMouseMovements) {
                if(positions.length == 0) {
                    tooltip.showAt(position, "<p>Click to add first point</p>");
                } else {
                    var cartesian = scene.camera.pickEllipsoid(position, ellipsoid);
                    if (cartesian) {
                        positions.pop();
                        // make sure it is slightly different
                        cartesian.y += (1 + Math.random());
                        positions.push(cartesian);
                        if(positions.length >= minPoints) {
                            poly.positions = positions;
                            poly._createPrimitive = true;
                        }
                        // update marker
                        markers.getBillboard(positions.length - 1).position = cartesian;
                        // show tooltip
                        tooltip.showAt(position, "<p>Click to add new point (" + positions.length + ")</p>" + (positions.length > minPoints ? "<p>Double click to finish drawing</p>" : ""));
                    }
                }
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

        mouseHandler.setInputAction(function(movement) {
            var position = movement.position;
            if(position != null) {
                if(positions.length < minPoints + 2) {
                    return;
                } else {
                    var cartesian = scene.camera.pickEllipsoid(position, ellipsoid);
                    if (cartesian) {
                        _self.stopDrawing();
                        if(typeof options.callback == 'function') {
                            // remove overlapping ones
                            var index = positions.length - 1;
                            // TODO - calculate some epsilon based on the zoom level
                            var epsilon = CesiumMath.EPSILON3;
                            for(; index > 0 && positions[index].equalsEpsilon(positions[index - 1], epsilon); index--) {}
                            options.callback(positions.splice(0, index + 1));
                        }
                    }
                }
            }
        }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    };
    
    DrawHelper.prototype.startDrawingExtent = function(options) {

        var options = copyOptions(options, this._defaultSurfaceOptions);

        this.startDrawing(
            function() {
                if(extent != null) {
                    primitives.remove(extent);
                }
                markers.remove();
                mouseHandler.destroy();
                tooltip.setVisible(false);
            }
        );

        var _self = this;
        var scene = this._scene;
        var primitives = this._scene.primitives;
        var tooltip = this._tooltip;

        var firstPoint = null;
        var extent = null;
        var markers = null;

        var mouseHandler = new ScreenSpaceEventHandler(scene.canvas);

        function updateExtent(value) {
            if(extent == null) {
                extent = new RectanglePrimitive();
                extent.asynchronous = false;
                primitives.add(extent);
            }
            extent.rectangle = value;
            // update the markers
            var corners = getExtentCorners(value);
            // create if they do not yet exist
            if(markers == null) {
                markers = new BillboardGroup(_self, options);
                markers.addBillboards(corners);
            } else {
                markers.updateBillboardsPositions(corners);
            }
         }

        // Now wait for start
        mouseHandler.setInputAction(function(movement) {
            if(movement.position != null) {
                var cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
                if (cartesian) {
                    if(extent == null) {
                        // create the rectangle
                        firstPoint = ellipsoid.cartesianToCartographic(cartesian);
                        var value = getExtent(firstPoint, firstPoint);
                        updateExtent(value);
                     } else {
                        _self.stopDrawing();
                        if(typeof options.callback == 'function') {
                            options.callback(getExtent(firstPoint, ellipsoid.cartesianToCartographic(cartesian)));
                        }
                    }
                }
            }
        }, ScreenSpaceEventType.LEFT_DOWN);

        mouseHandler.setInputAction(function(movement) {
            var position = movement.endPosition;
            if(position != null && !_self.ignoreMouseMovements) {
                if(extent == null) {
                    tooltip.showAt(position, "<p>Click to start drawing rectangle</p>");
                } else {
                    var cartesian = scene.camera.pickEllipsoid(position, ellipsoid);
                    if (cartesian) {
                        var value = getExtent(firstPoint, ellipsoid.cartesianToCartographic(cartesian));
                        updateExtent(value);
                        tooltip.showAt(position, "<p>Drag to change rectangle extent</p><p>Click again to finish drawing</p>");
                    }
                }
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

    };
    
    DrawHelper.prototype.startDrawingCircle = function(options) {

        var options = copyOptions(options, this._defaultSurfaceOptions);

        this.startDrawing(
            function cleanUp() {
                if(circle != null) {
                    primitives.remove(circle);
                }
                markers.remove();
                mouseHandler.destroy();
                tooltip.setVisible(false);
            }
        );

        var _self = this;
        var scene = this._scene;
        var primitives = this._scene.primitives;
        var tooltip = this._tooltip;

        var circle = null;
        var markers = null;

        var mouseHandler = new ScreenSpaceEventHandler(scene.canvas);

        // Now wait for start
        mouseHandler.setInputAction(function(movement) {
            if(movement.position != null) {
                var cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
                if (cartesian) {
                    if(circle == null) {
                        // create the circle
                        circle = new CirclePrimitive({
                            center: cartesian,
                            radius: 0,
                            asynchronous: false,
                            material : options.material
                        }, _self._defaultSurfaceOptions);
                        primitives.add(circle);
                        markers = new BillboardGroup(_self, _self._defaultBillboard);
                        markers.addBillboards([cartesian]);
                    } else {
                        if(typeof options.callback == 'function') {
                            options.callback(circle.getCenter(), circle.getRadius());
                        }
                        _self.stopDrawing();
                    }
                }
            }
        }, ScreenSpaceEventType.LEFT_DOWN);

        mouseHandler.setInputAction(function(movement) {
            var position = movement.endPosition;
            if(position != null) {
                if(circle == null) {
                    if (!_self.ignoreMouseMovements) {
                        tooltip.showAt(position, "<p>Click to start drawing the circle</p>");
                    }
                } else {
                    var cartesian = scene.camera.pickEllipsoid(position, ellipsoid);
                    if (cartesian) {
                        circle.setRadius(Cartesian3.distance(circle.getCenter(), cartesian));
                        markers.updateBillboardsPositions(cartesian);
                        tooltip.showAt(position, "<p>Move mouse to change circle radius</p><p>Click again to finish drawing</p>");
                    }
                }
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);
    };

    function getExtent(mn, mx) {
        var e = new Rectangle();

        // Re-order so west < east and south < north
        e.west = Math.min(mn.longitude, mx.longitude);
        e.east = Math.max(mn.longitude, mx.longitude);
        e.south = Math.min(mn.latitude, mx.latitude);
        e.north = Math.max(mn.latitude, mx.latitude);

        // Check for approx equal (shouldn't require abs due to re-order)
        var epsilon = CesiumMath.EPSILON7;

        if ((e.east - e.west) < epsilon) {
            e.east += epsilon * 2.0;
        }

        if ((e.north - e.south) < epsilon) {
            e.north += epsilon * 2.0;
        }

        return e;
    };

    function getExtentCorners(value) {

        return ellipsoid.cartographicArrayToCartesianArray([Rectangle.northwest(value), Rectangle.northeast(value), Rectangle.southeast(value), Rectangle.southwest(value)]);
    }
    
    return DrawHelper;
});

//    Cesium.Polygon.prototype.setStrokeStyle = setStrokeStyle;
//    
//    Cesium.Polygon.prototype.drawOutline = drawOutline;
//


/*
    _.prototype.createBillboardGroup = function(points, options, callbacks) {
        var markers = new _.BillboardGroup(this, options);
        markers.addBillboards(points, callbacks);
        return markers;
    }

*/
    function createTooltip(frameDiv) {

        var tooltip = function(frameDiv) {

            var div = document.createElement('DIV');
            div.className = "twipsy right";

            var arrow = document.createElement('DIV');
            arrow.className = "twipsy-arrow";
            div.appendChild(arrow);

            var title = document.createElement('DIV');
            title.className = "twipsy-inner";
            div.appendChild(title);

            this._div = div;
            this._title = title;

            // add to frame div and display coordinates
            frameDiv.appendChild(div);
        };

        tooltip.prototype.setVisible = function(visible) {
            this._div.style.display = visible ? 'block' : 'none';
        };

        tooltip.prototype.showAt = function(position, message) {
            if(position && message) {
                this.setVisible(true);
                this._title.innerHTML = message;
                this._div.style.left = position.x + 10 + "px";
                this._div.style.top = (position.y - this._div.clientHeight / 2) + "px";
            }
        };

        return new tooltip(frameDiv);
    }

    function getDisplayLatLngString(cartographic, precision) {
        return cartographic.longitude.toFixed(precision || 3) + ", " + cartographic.latitude.toFixed(precision || 3);
    }

    function clone(from, to) {
        if (from == null || typeof from != "object") return from;
        if (from.constructor != Object && from.constructor != Array) return from;
        if (from.constructor == Date || from.constructor == RegExp || from.constructor == Function ||
            from.constructor == String || from.constructor == Number || from.constructor == Boolean)
            return new from.constructor(from);

        to = to || new from.constructor();

        for (var name in from) {
            to[name] = typeof to[name] == "undefined" ? clone(from[name], null) : to[name];
        }

        return to;
    }
    
    function fillOptions(options, defaultOptions) {
        options = options || {};
        var option;
        for(option in defaultOptions) {
            if(options[option] === undefined) {
                options[option] = clone(defaultOptions[option]);
            }
        }
    }

    // shallow copy
    function copyOptions(options, defaultOptions) {
        var newOptions = clone(options), option;
        for(option in defaultOptions) {
            if(newOptions[option] === undefined) {
                newOptions[option] = clone(defaultOptions[option]);
            }
        }
        return newOptions;
    }

    function setListener(primitive, type, callback) {
        primitive[type] = callback;
    }

    function enhanceWithListeners(element) {

        element._listeners = {};

        element.addListener = function(name, callback) {
            this._listeners[name] = (this._listeners[name] || []);
            this._listeners[name].push(callback);
            return this._listeners[name].length;
        };

        element.executeListeners = function(event, defaultCallback) {
            if(this._listeners[event.name] && this._listeners[event.name].length > 0) {
                var index = 0;
                for(;index < this._listeners[event.name].length; index++) {
                    this._listeners[event.name][index](event);
                }
            } else {
                if(defaultCallback) {
                    defaultCallback(event);
                }
            }
        };
    }
