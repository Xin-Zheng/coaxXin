// this handles interactions with the analyst.js library, read the library's readme for further examples and details
coaxsApp.service('analystService', function (supportService) {

  this.isochrones = null;
  
  var Analyst = window.Analyst;
  var analyst = new Analyst(window.L, {
    apiUrl         : 'http://mit-analyst.conveyal.com/api',
    tileUrl        : 'http://mit-analyst.conveyal.com/tile',
    shapefileId    : '0579b6bd8e14ec69e4f21e96527a684b_376500e5f8ac23d1664902fbe2ffc364',
    graphId        : '5558f8234ee6498ccb15abbabf7a8909',
    showIso        : true,
  });

  var optionCurrent = {
    scenario      : {
      id            : 0,
      description   : 'Run from CoAXs SPA.',
      modifications : [],
    },
  }

  var allRoutes = ['CR-Fairmount', '749', '2b8cb87', '3c84732', '364b0b2', 'a3e69c4', '9d14048', '62e5305', 'a64adac', 'b35db84', '79d4855', '78cc24d'];
  var agencyId = '695c1ba';

  // holdes current states for different map layers, etc. (allows you to grab and remove, replace)
  var isoLayer   = null;

  var vectorIsos = null;
  var vecComIsos = null;
  
  var currentIso = null;
  var compareIso = null;


  // clear out everything that already exists, reset opacities to defaults
  this.resetAll = function (map) {
    if (isoLayer)   { isoLayer.setOpacity(1); };
    if (currentIso) { map.removeLayer(currentIso); };
    if (compareIso) { map.removeLayer(compareIso); };
    optionCurrent.scenario.modifications = []; // empty contents of the modifications list entirely
  };

  this.killCompareIso = function (map) {
    if (compareIso) { map.removeLayer(compareIso); };
    vecComIsos = false;
    compareIso = null;
  };

  // filter through and remove routes that we don't want banned on each scenario SPA call
  this.modifyRoutes = function (keepRoutes) { 
    keepRoutes = keepRoutes.map(function (route) { return route.routeId;  }); // we just want an array of routeIds, remove all else
    var rmRoutes = allRoutes.filter(function (route) { return keepRoutes.indexOf(route) < 0; });
    var routesMod = {
      type      : 'remove-trip',
      agencyId  : agencyId,
      routeId   : rmRoutes,
      tripId    : null,
    };
    optionCurrent.scenario.modifications.push(routesMod);
  };

  this.modifyDwells = function (keepRoutes) {
    var dwell10 = keepRoutes.filter(function (route) { return route.station == 2; }).map(function (route) { return route.routeId; });
    var dwell20 = keepRoutes.filter(function (route) { return route.station == 1; }).map(function (route) { return route.routeId; });
    var dwell30 = keepRoutes.filter(function (route) { return route.station == 0; }).map(function (route) { return route.routeId; });

    var dwellMod = {
      type: 'adjust-dwell-time',
      agencyId: agencyId,
      routeId: [],
      tripId: null,
      stopId: null,
      dwellTime: 30,
    };
    if (dwell10.length > 0) {
      dwellMod.routeId = dwell10; dwellMod.dwellTime = 10;
      optionCurrent.scenario.modifications.push(angular.copy(dwellMod));
    };
    if (dwell20.length > 0) {
      dwellMod.routeId = dwell20; dwellMod.dwellTime = 20;
      optionCurrent.scenario.modifications.push(angular.copy(dwellMod));
    };
    if (dwell30.length > 0) {
      dwellMod.routeId = dwell30; dwellMod.dwellTime = 30;
      optionCurrent.scenario.modifications.push(angular.copy(dwellMod));
    };
  };

  this.modifyFrequencies = function (keepRoutes) {
    keepRoutes = keepRoutes.map(function (route) { 
      return {
        routeId: route.routeId,
        frequency: route.peak.min * 60 + route.peak.sec
      };
    });

    keepRoutes.forEach(function (route) {
      optionCurrent.scenario.modifications.push({
        type: 'adjust-headway',
        agencyId: agencyId,
        routeId: [route.routeId],
        tripId: null,
        headway: route.frequency,
      });
    });
  }

  this.modifyModes = function (routeTypes) {
    optionCurrent.scenario.modifications.push({
      type: 'remove-trip',
      agencyId: agencyId,
      routeId: null,
      tripId: null,
      routeType: routeTypes
    });
	console.log(optionCurrent.scenario.modifications);
  }

  this.loadExisting = function (poi, map, cb) {
    vectorIsos = poi.isochrones;
    analyst.singlePointRequest({
      lat : poi.lat,
      lng : poi.lng,
    }, undefined, optionCurrent)
    .then(function (response) {
      if (isoLayer) {
        isoLayer.redraw(); 
      } else {
        isoLayer = response.tileLayer;
        isoLayer.addTo(map);
      }
      cb(true);
    })
    .catch(function (err) {
      console.log(err);
      cb(false);
    });;
  }

  // actually run the SPA and handle results from library
  this.singlePointRequest = function (marker, map, compareKey, cb) {
    console.log(optionCurrent);
	analyst.singlePointRequest({
      lat : marker.lat,
      lng : marker.lng,
    }, compareKey, optionCurrent)
    .then(function (response) { 
      if (isoLayer) {
        isoLayer.redraw(); 
      } else {
        isoLayer = response.tileLayer;
        isoLayer.addTo(map);
      }

      var subjects = {
        hh_zerocar: {
          id: 'smart_location_database.autoown0',
          verbose: 'Zero-car Households',
        },
        totpop: {
          id: 'smart_location_database.totpop10',
          verbose: 'Total Population',
        },
        jobs_tot: {
          id: 'smart_location_database.emptot',
          verbose: 'Total Jobs',
        },
        retail: {
          id: 'smart_location_database.e8_ret10',
          verbose: 'Retail Jobs'
        },
        healthcare: {
          id: 'smart_location_database.e8_hlth10',
          verbose: 'Health Care Jobs'
        },
        education: {
          id: 'smart_location_database.e8_ed10',
          verbose: 'Education Jobs'
        }
      };

      for (key in subjects) {
        var id = subjects[key].id;
        var tempArray = response.results.data[id].pointEstimate.sums;
        for (var i = 1; i < tempArray.length; i++) { tempArray[i] = tempArray[i] + tempArray[i-1] };
        subjects[key]['data'] = tempArray.map(function(count, i) { return { x : i, y : count } });
      }
      cb(response.results.key, subjects);
    })
    .catch(function (err) {
      console.log(err);
    });
  };

  // explicitly run request for vector isochrones
  this.vectorRequest = function (marker, compareTrue, cb) {
    analyst.vectorRequest({
      lat : marker.lat,
      lng : marker.lng,
    }, optionCurrent)
    .then(function (response) {
      if (compareTrue) { vecComIsos = response.isochrones; }
      else { vectorIsos = response.isochrones; }
      cb(true, response.isochrones);
    });
  };

  // swap between tile layer and vector isos layer
  this.showVectorIsos = function(timeVal, map) {
    if (isoLayer) { isoLayer.setOpacity(0) };
    if (currentIso) { map.removeLayer(currentIso); };
    if (compareIso) { map.removeLayer(compareIso); };

    var isosArray = vectorIsos.worstCase.features;
    for (var i=0; i<isosArray.length; i++) { 
      if (isosArray[i].properties.time == timeVal) { 
        currentIso = L.geoJson(isosArray[i], {
          style: {
            stroke      : true,
            fillColor   : '#FDB813',
            color       : '#F68B1F',
            weight      : 1,
            fillOpacity : 0.25,
            opacity     : 1
          }
        });
        currentIso.addTo(map);
      }
    }

    if (vecComIsos) {
      var isosArray = vecComIsos.worstCase.features;
      for (var i=0; i<isosArray.length; i++) { 
        if (isosArray[i].properties.time == timeVal) { 
          compareIso = L.geoJson(isosArray[i], {
            style: {
              stroke      : true,
              fillColor   : '#89cff0',
              color       : '#45b3e7',
              weight      : 1,
              fillOpacity : 0.25,
              opacity     : 1
            }
          });
          compareIso.addTo(map);
        }
      }  
    }
  };

});






