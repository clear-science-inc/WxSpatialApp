/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

/**
 * Angular service for area of interest and time of interest. 
 */
bdaSpatialApp.service('aoiToiService', function() {
        
    
    this.aois = [
        { 'label': 'Whole World', 'aoi': '-180,-90,180,90'},
        { 'label': 'North East US', 'aoi': '-80,38,-60,45'}, 
        { 'label': 'South East US', 'aoi': '-90,25,-75,38'},
        { 'label': 'North America', 'aoi': '-174,6.84,-50,65'},
        { 'label': 'Europe', 'aoi': '-20,35,40,70'},
        { 'label': 'Southern California', 'aoi': '-135,33,-115,38'},
        { 'label': 'Draw AOI', 'aoi': 'Draw Extent on map to define AOI'}];
        
    this.selectedAoi = this.aois[2];
    this.areaOfInterest = this.selectedAoi.aoi;
    
    this.timePeriods = [
        { 'label': '1 day', 'numDays': 1},
        { 'label': '3 days', 'numDays': 3}, 
        { 'label': '5 days', 'numDays': 5},
        { 'label': '1 week', 'numDays': 7},
        { 'label': '10 days', 'numDays': 10},
        { 'label': 'Define TOI ...', 'numDays': 0}];
    
    this.selectedTimePeriod = this.timePeriods[1];
    this.calStartTime;
    this.calEndTime;
    this.toggledDrawAoi = false;
    
    /**
     * Computes the start and end time from the selected time period and
     * sets those variables. 
     */
    this.updateStartAndEndTime = function() {
        this.endTime = computeEndTime();
        this.startTime = new Date(this.endTime.getTime() - this.selectedTimePeriod.numDays*24*60*60*1000);
        
        /**
         * Compute the end time based on time period selected. 
         * End time is midnight tomorrow UTC.
         * @return {Date} 
         */
        function computeEndTime() {
            var now = new Date();
            var midnight = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
            return new Date(midnight.getTime() + 24*60*60*1000);
        }
    };
    
    this.updateStartAndEndTime();

});