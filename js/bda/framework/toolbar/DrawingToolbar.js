/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Cesium/Core/Cartesian2',
    'Cesium/Core/Cartesian3',
    'Cesium/Core/Color',
    'Cesium/Core/Cartographic',
    'Cesium/Core/Ellipsoid',
    'Cesium/Core/Math',
    'Cesium/Core/NearFarScalar',
    'Cesium/Core/PinBuilder',
    'Cesium/Scene/BillboardCollection',
    'Cesium/Scene/HorizontalOrigin',
    'Cesium/Scene/LabelCollection',
    'Cesium/Scene/LabelStyle',
    'Cesium/Scene/Material',
    'Cesium/Scene/VerticalOrigin',
    'DrawHelper/DrawHelper',
    'DrawHelper/BillboardGroup',
    'DrawHelper/CirclePrimitive',
    'DrawHelper/EllipsePrimitive',
    'DrawHelper/ExtentPrimitive',
    'DrawHelper/PolygonPrimitive',
    'DrawHelper/PolylinePrimitive'
], function(
    Cartesian2,
    Cartesian3,
    Color,
    Cartographic,
    Ellipsoid,
    CesiumMath,
    NearFarScalar,
    PinBuilder,
    BillboardCollection,
    HorizontalOrigin,
    LabelCollection,
    LabelStyle,
    Material,
    VerticalOrigin,
    DrawHelper,
    BillboardGroup,
    CirclePrimitive,
    EllipsePrimitive,
    ExtentPrimitive,
    PolygonPrimitive,
    PolylinePrimitive
)
{
    "use strict";

    /**
     * Constructor for user interaction for drawing  on map.
     * @constructor
     * @param {CesiumWidget} container
     */
    var DrawingToolbar = function(container) {
        var scene = container.scene;
        
        // start the draw helper to enable shape creation and editing
        var drawHelper = new DrawHelper(container);
        var drawingToolbar = drawHelper.addToolbar(document.getElementById("drawingToolbar"), {
            buttons: ['marker', 'polyline', 'polygon', 'circle', 'extent']
        });
        var pinBuilder = new PinBuilder();
        
        drawingToolbar.addListener('drawingStarted', function(event) {
            var type = event.type;
            showDrawingInputs(drawHelper);
        });
        
        drawingToolbar.addListener('markerCreated', function(event) {
            // create one common billboard collection for all billboards
            var billboardCollection = new BillboardCollection();
            
            // tag it as a drawing primitive
            billboardCollection.tag = "DRAWHELPER";
            
            // Get user inputs
            var userInputs = getInputs();
            var solidColor = Color.fromCssColorString(userInputs.color);
            var alphaColor = Color.clone(solidColor);
            alphaColor.alpha = userInputs.opacity / 100.0;
            var initial = (userInputs.name) ? userInputs.name[0] : ' ';
            
            scene.primitives.add(billboardCollection);
            var billboard = billboardCollection.add({
                show : true,
                position : event.position,
                pixelOffset : new Cartesian2(0, 0),
                eyeOffset : new Cartesian3(0.0, 0.0, 0.0),
                horizontalOrigin : HorizontalOrigin.CENTER,
                verticalOrigin : VerticalOrigin.CENTER,
                scale : 1.0,
                image : pinBuilder.fromText(initial, alphaColor, 30),
                color : new Color(1.0, 1.0, 1.0, 1.0)
            });
            billboard.setEditable();
            
            // Save off marker parameters in json string as id, so marker
            // can be re-created using save/load options
            billboard.id = JSON.stringify({type: 'MARKER', color: alphaColor, text: initial});
            
            // Add label above marker
            if (userInputs.name) {
                addLabel(billboard, event.position, userInputs.name, solidColor, true);
            }            
        });
        
        drawingToolbar.addListener('polylineCreated', function(event) {
            // Get user inputs
            var userInputs = getInputs();
            var solidColor = Color.fromCssColorString(userInputs.color);
            var alphaColor = Color.clone(solidColor);
            alphaColor.alpha = userInputs.opacity / 100.0;
            
            var polyline = new PolylinePrimitive({
                positions: event.positions,
                width: 5,
                geodesic: true,
                material: Material.fromType('Color', {color: alphaColor})
            }, drawHelper._defaultPolylineOptions);
                        
            scene.primitives.add(polyline);
            polyline.setEditable();
            
            // Add label to first point
            if (userInputs.name) {
                addLabel(polyline, event.positions[0], userInputs.name, solidColor, false);
            }            
        });
        
        drawingToolbar.addListener('polygonCreated', function(event) {
            // Get user inputs
            var userInputs = getInputs();
            var solidColor = Color.fromCssColorString(userInputs.color);
            var alphaColor = Color.clone(solidColor);
            alphaColor.alpha = userInputs.opacity / 100.0;
            
            var polygon = new PolygonPrimitive({
                positions: event.positions,
                material: Material.fromType('Color', {color: alphaColor})
            }, drawHelper._defaultSurfaceOptions);
            scene.primitives.add(polygon);
            polygon.setEditable();
            
            // Add label to first point
            if (userInputs.name) {
                addLabel(polygon, event.positions[0], userInputs.name, solidColor, false);
            }            
        });
        
        drawingToolbar.addListener('circleCreated', function(event) {
            // Get user inputs
            var userInputs = getInputs();
            var solidColor = Color.fromCssColorString(userInputs.color);
            var alphaColor = Color.clone(solidColor);
            alphaColor.alpha = userInputs.opacity / 100.0;
            
            var circle = new CirclePrimitive({
                center: event.center,
                radius: event.radius,
                material: Material.fromType('Color', {color: alphaColor})
            }, drawHelper._defaultSurfaceOptions);
            scene.primitives.add(circle);
            circle.setEditable();
            
            // Add label above circle
            if (userInputs.name) {
                var carte3 = new Cartesian3(event.center.x, event.center.y+event.radius, event.center.z);   // TODO: FIX Z, z of center is not same as top of circle, label may be off or missing (zoom in to see it)
                addLabel(circle, carte3, userInputs.name, solidColor, false);
                // addLabel(circle, event.center, userInputs.name, solidColor, false);
            }            
        });
        
        drawingToolbar.addListener('extentCreated', function(event) {
            // Get user inputs
            var userInputs = getInputs();
            var solidColor = Color.fromCssColorString(userInputs.color);
            var alphaColor = Color.clone(solidColor);
            alphaColor.alpha = userInputs.opacity / 100.0;
            
            var extent = event.extent;
            var extentPrimitive = new ExtentPrimitive({
                extent: extent,
                material: Material.fromType('Color', {color: alphaColor})
            }, drawHelper._defaultSurfaceOptions);
            scene.primitives.add(extentPrimitive);
            extentPrimitive.setEditable();
            
            // Add label above rectangle
            if (userInputs.name) {
                var rect = event.extent;
                var centerLon = rect.west + (rect.east - rect.west)/2.0;
                var carto = new Cartographic.fromRadians(centerLon, rect.north);
                var carte3 = Ellipsoid.WGS84.cartographicToCartesian(carto);

                addLabel(extentPrimitive, carte3, userInputs.name, solidColor, false);
            }            
        });
        
        // Listen for showDrawHelperInputs turned off
        var scope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
        scope.$watch('toolbarService.showDrawHelperInputs', function(newVal, oldVal) {
            if (newVal != oldVal) {
                if (!newVal) {
                    drawHelper.ignoreMouseMovements = false;
                }
            }
        });  
        
        // Listen for Add Marker Event for Marker icon in Utilities & Tools
        scope.$watch('toolbarService.startPlaceMarker', function(newVal, oldVal) {
            if (newVal != oldVal) {
                if (newVal) {
                    // Fire 'drawingStarted' event
                    drawingToolbar.executeListeners({name: 'drawingStarted', type: 'marker'});
                    drawHelper.startDrawingMarker({
                        callback: function(position) {
                            drawingToolbar.executeListeners({name: 'markerCreated', position: position});
                        }
                    });
                       
                    scope.toolbarService.startPlaceMarker = false;
                }
            }
        });
        
        /**
         * Adds label and associates it with the primitive.
         * @param {ChangeablePrimitive | enhancePrimitive} primitive 
         * @param {Cartesian3} position
         * @param {String} name
         * @param {Color} color
         * @param {boolean} useTranslucencyByDistance
         */
        function addLabel(primitive, position, name, color, useTranslucencyByDistance) {
            var outlineColor = color.darken(.5, new Color());
            var labels = new LabelCollection();
            var label = labels.add({
                position : position,
                text : name,
                horizontalOrigin :HorizontalOrigin.CENTER,
                pixelOffset : new Cartesian2(0.0, -20),
                font: '20px sans-serif',
                outlineColor : outlineColor,
                outlineWidth : 1,
                style : LabelStyle.FILL_AND_OUTLINE,
                fillColor: color });
                
            if (useTranslucencyByDistance) {
                label.translucencyByDistance = new NearFarScalar(1.5e3, 1.0, 10.0e6, 0.0);
            }

            labels.tag = 'DRAWHELPER';
            primitive.setLabel(label);
            scene.primitives.add(labels);
        }    
    };
    
    /**
     * Shows the drawing inputs GUI by setting the show variable.
     * @param {DrawHelper} drawHelper
     */
    var showDrawingInputs = function (drawHelper) {
        drawHelper.ignoreMouseMovements = true;
        var scope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
        scope.toolbarService.showDrawHelperInputs = true;        
    };
    
    /**
     * Gets the drawing inputs. 
     */
    var getInputs = function() {
        return angular.element(document.getElementById('drawingInputsCtrl')).scope();
    };
    
    return DrawingToolbar;
});
