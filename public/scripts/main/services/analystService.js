coaxsApp.service('analystService', function ($q, supportService) {

  this.isochrones = null;

  var Analyst = window.Analyst;
  var analyst = new Analyst(window.L, {
    apiUrl      : 'http://mit-analyst.dev.conveyal.com/api',
    tileUrl     : 'http://mit-analyst.dev.conveyal.com/tile',
    shapefileId : '0579b6bd8e14ec69e4f21e96527a684b_376500e5f8ac23d1664902fbe2ffc364',
    graphId     : '0ebb30ab8664001407b0ad524b102bd4',
    showIso     : true
  });
  var isoLayer   = null;
  var vectorIsos = null;

  this.singlePointRequest = function (marker, map) {
    analyst.singlePointRequest({
      lat : marker.model.lat,
      lng : marker.model.lng,
    })
    .then(function (response) {
      if (isoLayer) {
        isoLayer.redraw();
      } else {
        isoLayer = response.tileLayer;
        isoLayer.addTo(map);
      }
    })
    .catch(function (err) {
      console.log(err);
    });
  }


  this.vectorRequest = function (marker, cb) {
    analyst.vectorRequest({
      lat : marker.model.lat,
      lng : marker.model.lng,
    })
    .then(function (response) {
      vectorIsos = response.isochrones;
      cb(vectorIsos);
    });
  }

  this.showVectorIsos = function(timeVal) {
      if (isoLayer) { 
        isoLayer.setOpacity(0);
        console.log(isoLayer); };
      return vectorIsos.worstCase

      // var bestIsos = vectorIsos.worstCase.features; 
      // var returnElement = null;
      // for (var i=0; i<bestIsos.length; i++) {
      //   if (bestIsos[i].properties.time == timeVal) {
      //     return bestIsos[i].geometry;
      //   }
      // }
  }

});






