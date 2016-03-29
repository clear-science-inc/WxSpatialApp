/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/Color',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/ExtrapolationType',
        '../Core/getFilenameFromUri',
        '../Core/HermitePolynomialApproximation',
        '../Core/isArray',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/LagrangePolynomialApproximation',
        '../Core/LinearApproximation',
        '../Core/loadJson',
        '../Core/Math',
        '../Core/Quaternion',
        '../Core/Rectangle',
        '../Core/ReferenceFrame',
        '../Core/RuntimeError',
        '../Core/Spherical',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/LabelStyle',
        '../Scene/VerticalOrigin',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './BillboardGraphics',
        './ColorMaterialProperty',
        './CompositeMaterialProperty',
        './CompositePositionProperty',
        './CompositeProperty',
        './ConstantPositionProperty',
        './ConstantProperty',
        './DataSourceClock',
        './EllipseGraphics',
        './EllipsoidGraphics',
        './EntityCollection',
        './GridMaterialProperty',
        './ImageMaterialProperty',
        './LabelGraphics',
        './ModelGraphics',
        './PathGraphics',
        './PointGraphics',
        './PolygonGraphics',
        './PolylineGlowMaterialProperty',
        './PolylineGraphics',
        './PolylineOutlineMaterialProperty',
        './PositionPropertyArray',
        './RectangleGraphics',
        './ReferenceProperty',
        './SampledPositionProperty',
        './SampledProperty',
        './StripeMaterialProperty',
        './StripeOrientation',
        './TimeIntervalCollectionPositionProperty',
        './TimeIntervalCollectionProperty',
        './WallGraphics'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        ClockRange,
        ClockStep,
        Color,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        ExtrapolationType,
        getFilenameFromUri,
        HermitePolynomialApproximation,
        isArray,
        Iso8601,
        JulianDate,
        LagrangePolynomialApproximation,
        LinearApproximation,
        loadJson,
        CesiumMath,
        Quaternion,
        Rectangle,
        ReferenceFrame,
        RuntimeError,
        Spherical,
        TimeInterval,
        TimeIntervalCollection,
        HorizontalOrigin,
        LabelStyle,
        VerticalOrigin,
        Uri,
        when,
        BillboardGraphics,
        ColorMaterialProperty,
        CompositeMaterialProperty,
        CompositePositionProperty,
        CompositeProperty,
        ConstantPositionProperty,
        ConstantProperty,
        DataSourceClock,
        EllipseGraphics,
        EllipsoidGraphics,
        EntityCollection,
        GridMaterialProperty,
        ImageMaterialProperty,
        LabelGraphics,
        ModelGraphics,
        PathGraphics,
        PointGraphics,
        PolygonGraphics,
        PolylineGlowMaterialProperty,
        PolylineGraphics,
        PolylineOutlineMaterialProperty,
        PositionPropertyArray,
        RectangleGraphics,
        ReferenceProperty,
        SampledPositionProperty,
        SampledProperty,
        StripeMaterialProperty,
        StripeOrientation,
        TimeIntervalCollectionPositionProperty,
        TimeIntervalCollectionProperty,
        WallGraphics) {
    "use strict";
    
    /**
     * GDIT Developed Application -- This is being generated to take in a twitter json file and display it on the map with the drag and drop capability.
     * 								 The above includes where kept in here becasue I started with the CZML data source.
     */

    /**
     *  generating a blank document packet for the tweet json data
     */
    var DocumentPacket = function() {
        this.name = undefined;
        this.clock = undefined;
    };
    
    /**
     * A {@link DataSource} which processes Tweet JSON data.
     * @alias TweetJSONDataSource
     * @constructor
     *
     * @param {String} [name] An optional name for the data source.  This value will be overwritten if a loaded document contains a name.
     *
     * @demo None
     */
    var TweetJSONDataSource = function(name) {
        this._name = name;
        this._changed = new Event(); /** Defined in another js package */
        this._error = new Event(); /** Defined in another js package */
        this._isLoading = false;
        this._loading = new Event(); /** Defined in another js package */
        this._clock = undefined;
        this._documentPacket = new DocumentPacket(); /** Defined above */
        this._version = undefined;
        this._entityCollection = new EntityCollection(); /** Defined in another js package */
    };
    
    /**
     * Gets the array of CZML processing functions.
     * @memberof CzmlDataSource
     * @type Array
     */ 
    /* need to implement this*/
/*    TweetJSONDataSource.updaters = [
    processBillboard, //
    processEllipse, //
    processEllipsoid, //
    processLabel, //
    processModel, //
    processName, //
    processDescription, //
    processPath, //
    processPoint, //
    processPolygon, //
    processPolyline, //
    processRectangle, //
    processPosition, //
    processViewFrom, //
    processWall, //
    processOrientation, //
    processAvailability];
*/    
    TweetJSONDataSource.updaters = [];
    
    /**
     * Replaces any existing data with the provided tweetjson.
     *
     * @param {Object} tweetjson The TweetJSON to be processed.
     * @param {String} source The source URI of the TweetJSON.
     */
    TweetJSONDataSource.prototype.load = function(tweetjson, sourceUri) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(tweetjson)) {
            throw new DeveloperError('tweetjson is required.');
        }
        //>>includeEnd('debug');

        this._version = '1.1';
        this._documentPacket = new DocumentPacket(); /** Defined in this package */
        this._entityCollection.removeAll();
        loadTweetJSON(this, tweetjson, sourceUri);
    };
     
    function loadTweetJSON(dataSource, tweetjson, sourceUri) {
        var entityCollection = dataSource._entityCollection;
        entityCollection.suspendEvents();

        TweetJSONDataSource._processTJson(tweetjson, entityCollection, sourceUri, undefined, dataSource);

        var raiseChangedEvent = updateClock(dataSource);

        var documentPacket = dataSource._documentPacket;
        if (defined(documentPacket.name) && dataSource._name !== documentPacket.name) {
            dataSource._name = documentPacket.name;
            raiseChangedEvent = true;
        } else if (!defined(dataSource._name) && defined(sourceUri)) {
            dataSource._name = getFilenameFromUri(sourceUri);
            raiseChangedEvent = true;
        }

        entityCollection.resumeEvents();
        if (raiseChangedEvent) {
            dataSource._changed.raiseEvent(dataSource);
        }
    }

    function processTJsonPacket(packet, entityCollection, updaterFunctions, sourceUri, dataSource) {
        var objectId = packet.id;
        if (!defined(objectId)) {
            objectId = createGuid();
        }

        currentId = objectId;

/*        if (!defined(dataSource._version) && objectId !== 'document') {
            throw new RuntimeError('The first CZML packet is required to be the document object.');
        }
*/
        
        if (packet['delete'] === true) {
            entityCollection.removeById(objectId);
        } else if (objectId === 'document') {
            processDocument(packet, dataSource);
        } else {
            var entity = entityCollection.getOrCreateEntity(objectId);

            var parentId = packet.parent;
            if (defined(parentId)) {
                entity.parent = entityCollection.getOrCreateEntity(parentId);
            }

            for (var i = updaterFunctions.length - 1; i > -1; i--) {
                updaterFunctions[i](entity, packet, entityCollection, sourceUri);
            }
        }

        currentId = undefined;
    }
    
    /**********************************************************************
    **********************************************************************/
    
    TweetJSONDataSource._processTJson = function(tweetjson, entityCollection, sourceUri, updaterFunctions, dataSource) {
        updaterFunctions = defined(updaterFunctions) ? updaterFunctions : TweetJSONDataSource.updaters;

        if (isArray(tweetjson)) {
            for (var i = 0, len = tweetjson.length; i < len; i++) {
                processTJsonPacket(tweetjson[i], entityCollection, updaterFunctions, sourceUri, dataSource);
            }
        } else {
            processTJsonPacket(tweetjson, entityCollection, updaterFunctions, sourceUri, dataSource);
        }
    };
    
    return TweetJSONDataSource;
});


