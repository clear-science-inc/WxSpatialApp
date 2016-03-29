/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Cesium/DataSources/CzmlDataSource',
    'Cesium/DataSources/KmlDataSource',
    'Cesium/ThirdParty/when'


], function(
    CzmlDataSource,
    KmlDataSource,
    when
)
{
    "use strict";

    var theViewer;
    var dataSources;
    var gallery = './resources/data/';
    var gallery2 = './resources/data/kml/';

    /**
     * TweetController Object. It controls interactions between the Tweet UI
     * controls and the Cesium map.
     * @constructor
     * @param {Viewer} viewer  The viewer instance
     */
    var TweetController = function(viewer) {
        theViewer = viewer;
        dataSources = viewer.dataSources;
        setupTweetListener();
    };

    /**
     * Sets up listener on the tweet layers.
     */
    function setupTweetListener() {
        var scope = angular.element(document.getElementById('socialMediaCtrl')).scope();

        scope.$watch('displayTweet', function(newVal, oldVal) {
            if (newVal != oldVal) {
                if (newVal) {
                    displayTweet(newVal);
                }
            }
        });

        scope.$watch('deleteTweet', function(newVal, oldVal) {
            if (newVal != oldVal) {
                if (newVal) {
                	deleteOverlay(newVal);
					scope.deleteTweet = false;
                }
            }
        });

        scope.$watch('displayKML', function(newVal, oldVal) {
            if (newVal != oldVal) {
                if (newVal) {
                    displayKML(newVal);
                }
            }
        });

        scope.$watch('deleteKML', function(newVal, oldVal) {
            if (newVal != oldVal) {
                if (newVal) {
                	deleteOverlay(newVal);
                }
            }
        });
    }

    /**
     * Displays tweet layer on the map.
     * @param {filename: String, id: String} tweet
     */
    function displayTweet (tweet) {
        var czmlDataSource = new CzmlDataSource();
        var dataSources = theViewer.dataSources;

        when(czmlDataSource.load(gallery + tweet.filename), function() {
            dataSources.add(czmlDataSource);
        }, function (error) {
            var scope = angular.element(document.getElementById('socialMediaCtrl')).scope();
            scope.tweetDisplayError = tweet.id;
        });
    }

    /**
     * Deletes a tweet layer.
     * @param {String} czmlFileName
     */
    function deleteOverlay(overlayFileName) {
        var dataSourceToRemove = getDataSourceByName(theViewer.dataSources, overlayFileName);
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
     * Displays KML layer on the map.
     * @param {filename: String, id: String} KML
     */
    function displayKML (kml) {
        var kmlDataSource = new KmlDataSource();
        var dataSources = theViewer.dataSources;

        when(kmlDataSource.load(gallery2 + kml.filename), function() {
            dataSources.add(kmlDataSource);
        }, function (error) {
            var scope = angular.element(document.getElementById('socialMediaCtrl')).scope();
            scope.tweetDisplayError = kml.id;
        });
    }

    return TweetController;
});