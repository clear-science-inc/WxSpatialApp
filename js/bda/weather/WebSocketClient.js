/**
 * Copyright 2014 General Dynamics Information Technology.
 */

bdaSpatialApp.factory('WebSocketService', function(propertiesFactory) {
    var service = {
        messageHandler:null
    };

    var ws = null;

    var promise = propertiesFactory.getProperties();
    promise.then(
        function(properties) {
        	var webSocketUrl = 'ws://' + window.location.hostname + ':'
        		+ properties.data.webSocketPort + properties.data.webSocketCatalogRequest;
         	ws = new WebSocket(webSocketUrl);

            ws.onmessage = function(message) {
                if (service.messageHandler != null) {
                    service.messageHandler(message);
                }
            };

            ws.onopen = function() {
                service.send("getCatalog");
            };
        },
        function(error) {
              console.error('failure loading properties, cannot open websocket without websocket URL property: ', error);
        });

    service.send = function(message) {
        ws.send(message);
    };

    // TODO: delete readyState()
    service.readyState = function() {
        return ws.readyState;
    };

    return service;
});

bdaSpatialApp.controller("WebSocketClientCtlr", function($scope, WebSocketService, weatherService) {

    $scope.weatherService = weatherService;
    $scope.bogusData = [
        '{"type":"Forecast Model","modelName":"NAVGEM","modelSource":"ABC","location":"Asia","parameter":"Temperature","level":"700m AGL","forecastTime":1409032800000,"modelTime":1408946400000,"uuid":"1408973197341e"}',
        '{"type":"Forecast Model","modelName":"COAMPS","modelSource":"ABC","location":"CONUS","parameter":"Pressure","level":"700m AGL","forecastTime":1408935600000,"modelTime":1408924800000,"uuid":"1408973291762e"}',
        '{"type":"Forecast Model","modelName":"NAVGEM","modelSource":"GHI","location":"Europe","parameter":"Wind Speed","level":"500m AGL","forecastTime":1408957200000,"modelTime":1408924800000,"uuid":"1408973313514e"}',
        '{"type":"Forecast Model","modelName":"NAVGEM","modelSource":"GHI","location":"Europe","parameter":"Temperature","level":"2m AGL","forecastTime":1409043600000,"modelTime":1408968000000,"uuid":"1408973340503w"}',
        '{"type":"Forecast Model","modelName":"GFS","modelSource":"DEF","location":"Asia","parameter":"Precipitation","level":"1000m AGL","forecastTime":1409000400000,"modelTime":1408946400000,"uuid":"1408973394303t"}',
        '{"type":"Forecast Model","modelName":"WRF","modelSource":"DEF","location":"Asia","parameter":"Pressure","level":"600m AGL","forecastTime":1408989600000,"modelTime":1408924800000,"uuid":"1408973442389q"}',
        '{"type":"Forecast Model","modelName":"COAMPS","modelSource":"ABC","location":"CONUS","parameter":"Temperature","level":"200m AGL","forecastTime":1409076000000,"modelTime":1408989600000,"uuid":"1408973482615r"}',
        '{"type":"Forecast Model","modelName":"GFS","modelSource":"GHI","location":"Europe","parameter":"Wind Speed","level":"700m AGL","forecastTime":1408978800000,"modelTime":1408924800000,"uuid":"1408973503482w"}',
        '{"type":"Forecast Model","modelName":"GFS","modelSource":"NCEP","location":"Asia","parameter":"Pressure","level":"100m AGL","forecastTime":1409032800000,"modelTime":1408989600000,"uuid":"1408973560226t"}',
        '{"type":"Forecast Model","modelName":"NAVGEM","modelSource":"NCEP","location":"Asia","parameter":"Wind Speed","level":"900m AGL","forecastTime":1409076000000,"modelTime":1408989600000,"uuid":"1408973591699x"}',
        '{"type":"Forecast Model","modelName":"COAMPS","modelSource":"NCEP","location":"Europe","parameter":"Relative Humidity","level":"1000m AGL","forecastTime":1408957200000,"modelTime":1408924800000,"uuid":"1408973664624v"}',
        '{"type":"Forecast Model","modelName":"GFS","modelSource":"ABC","location":"CONUS","parameter":"Temperature","level":"100m AGL","forecastTime":1409011200000,"modelTime":1408989600000,"uuid":"1408973793370v"}',
        '{"type":"Forecast Model","modelName":"GFS","modelSource":"DEF","location":"CONUS","parameter":"Wind Speed","level":"900m AGL","forecastTime":1409000400000,"modelTime":1408924800000,"uuid":"1408973816035v"}'
    ];  // TODO: delete bogusData

    WebSocketService.messageHandler = function(message) {
        receiveMessage(message.data);
    };

    $scope.sendTestMessageRequest = function() {
        if (WebSocketService.readyState() == 1) {        //TODO: delete if
        	WebSocketService.send("requestTestMessage");
    	}
    	else { // use bogus data for test purposes until websocket is stood up in cloud            TODO: delete else
    	    receiveMessage($scope.bogusData.pop());    // TODO: delete return bogusData
    	}

    };

    function receiveMessage(text) {
    	var entry = JSON.parse(text);
    	if (entry instanceof Array) {
            $scope.weatherService.addProducts(entry, false);
    	} else {
            $scope.weatherService.addProducts([entry], true);
        }
    };
});

