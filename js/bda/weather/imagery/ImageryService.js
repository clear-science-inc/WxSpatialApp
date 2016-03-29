/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

angular.module('bdaSpatialApp').service('imageryService', function() {

    this.showUSRadar = false;
	this.showWorldSatellite = false;
    this.showUSSatellite_IR = false;
    this.showUSSatellite_VIS = false;
    this.showUSSatellite_WV = false;
    this.showUSECSatellite_IR = false;
    this.showUSECSatellite_VIS = false;
    this.showUSECSatellite_WV = false;
    this.showUSWCSatellite_IR = false;
    this.showUSWCSatellite_VIS = false;
    this.showUSWCSatellite_WV = false;
    this.showUSHASatellite_IR = false;
    this.showUSHASatellite_VIS = false;
    this.showUSHASatellite_WV = false;
    this.showUSAKSatellite_IR = false;
    this.showUSAKSatellite_VIS = false;
    this.showUSAKSatellite_WV = false;
    this.showEchotop = false;
    this.showPhoenixBR = false;
    this.showPhoenixET = false;

    this.wmsLayer;
    this.animationLayer;
});