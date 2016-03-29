/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

bdaSpatialApp.service('thresholdingService', function() {
    
    /** @const */ var DEFAULT_NUM_TICKS = 10;
    this.thresholdingApplied = 0;
    
    this.thresholdingParameters = [
        {name: 'verticalVisibility',   label: 'Ceiling',           isFlipped: true,  marginal: 3000, severe: 300, type: 'Altitude', min:   0, max: 10000, numTicks: 5},
        {name: 'horizontalVisibility', label: 'Visibility',        isFlipped: true,  marginal:    3, severe:   1, type: 'Distance', min:   0, max:    30, numTicks: DEFAULT_NUM_TICKS},
        {name: 'windSpeed',            label: 'Wind Speed',        isFlipped: false, marginal:   25, severe:  35, type: 'Speed',    min:   0, max:   200, numTicks: DEFAULT_NUM_TICKS},
        {name: 'airTemperature',       label: 'Temperature',       isFlipped: true,  marginal:    5, severe:   0, type: 'Degrees',  min: -15, max:    50, numTicks: DEFAULT_NUM_TICKS},
        {name: 'totalCloudCover',      label: 'Total Cloud Cover', isFlipped: false, marginal:   50, severe:  75, type: 'Percent',  min:   0, max:   100, numTicks: DEFAULT_NUM_TICKS}
    ];
});