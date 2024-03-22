"use strict";

const maintenance_flag = false

//variables start
const date = new Date();
const today = date.toLocaleString('default', { month: 'long' }) + ' ' + date.getDate() + ' ' + date.getFullYear();
const webversion = 'v0.84 (Beta)';
var errorcode1 = ''
var errorcode2 = ''
var type = '';
var layer = '';
var layer2 = '';
var layer3 = false;
var full_project_name = '';
var proj_name = '';
var proj_folder = '';
var dem_layer = '';
var soil_layer = '';
var land_layer = '';
var hyd_cond = '';
var acc_thr = '';
var extentslayer = '';
var strgson = '';
var pjs_zoom = true;
var gagelist = '';
var provstring = '';
var landslope = '';
var asoil = '';
var IA = '';
var LI = '';
var areami2 = '';
var basin_lu = '';
var basin_soil = '';
var mark_lat = '';
var mark_lon = '';
var delcheck = true;
var fpcheck = false;
var olcheck = false;
var rscheck = false;
var delcheckin = true;
var wshed_export = '';
var infstr_export = '';
var contourslayer = '';
var longestpath_layer = '';
var soils_layer = '';
var landuse_layer = '';
var curvenumber_layer = '';
var addpointvar = false;
var clear_outlets = false;
var clear_flowpaths = false;
var subshed_export = '';
var Pixel_;
var Type_;
var Mixed_;
var Elev_;
var Slope_;
var AvgArea_;
var Width_;
var Depth_;
var Xarea_;
var Tot_Length_;
var Vel_;
var I_Time_;
var Tot_Time_;
var t_ = [];
var tt_ = [];
var t_temp = [];
var e_temp = [];
var s_temp = [];
var a_temp = [];
var w_temp = [];
var d_temp = [];
var x_temp = [];
var tl_temp = [];
var v_temp = [];
var it_temp = [];
var tt_temp = [];
var thecritavg = '';
var inputstring = '';
var errorstring = '';
var outputstring = '';
var preciplist = [];
var transect_bool = '';
var plot_data = '';
var TWE_max = '';
var TWE_min = '';
var areami2_usda = '';
var reachslope = '';
var ratingtype = '';
var minstage = '';
var reachno = '';
var ratingdata = '';
var totalrating = [];
var totalreach = [];
var totaltype = [];
var totalstage = [];
var reaches = '';
var totalDistance = 0;
var tabledata = '';
var reachcount = '';
var reachcount_ = '';
var subid = '';
var singleshed = false;
var upper90 = false;
var frre_modal = [];
var userdachange = [];
var userdachange_perm = [];
var usercnchange = [];
var usercnchange_perm = [];
var usertcchange = [];
var cellsize = "";
var dataready = false;
var infstr_url = '';
var region_flag = true;
var landerror = '00';
var soilerror = '00';
var hyderror = '00';
var nhdhrflag = false;
var userflag = false;
var userstrflag = false;
var transectLayers = {};
var projectTable0 = '';
var projectTable1 = '';
var projectTable2 = '';
var projectTable3 = '';
var btableregion_html = '';
var projectTable4 = '';
var projectTable5 = '';
var projectTable6 = '';
var projectTable7;
var projectTable9 = '';
var projectTable10 = '';
var projectTable11_r = [];
var projectTable12_r = [];
var projectTable13_r = [];
var warning_message = [];
var html_warning = '';
var regioncount = '';
var streamLayer = "";
var streamLayer2 = "";
var lustyle = null;
var siteconfig = null;
var errorcat = null;
var hot;
var uploadshp = '';
var uploadshp_flag = false;
var upllayerflag = false
var uploaded_coords = [];
var zipresult;
var redosubshed_flag = false;

window.addEventListener('load', function () {
    servercheck()
})

$.ajax({
    'async': false,
    'global': false,
    'url': "json/site-config.json",
    'dataType': "json",
    'success': function (jsondata) {
        siteconfig = jsondata;
    }
});

$.ajax({
    'async': false,
    'global': false,
    'url': "json/error-catalog.json",
    'dataType': "json",
    'success': function (jsondata) {
        errorcat = jsondata;
    }
});

$('#demselect').on('change', function () {
    if (document.getElementById("demselect").value == "neddem10") {
        document.getElementById("acc_thres").value = 6
    } else {
        document.getElementById("acc_thres").value = 60
    }
});

$('#tc_method').on('change', function () {
    $("#velocitydisplay").css('display', (this.value == 'Velocity Method') ? 'block' : 'none');
});

$('#channelflow').on('change', function () {
    $("#sourcearea-display").css('display', (this.value == 'inferredstreams') ? 'block' : 'none');
});

var velmethcheckboxcheckBoxlayer = $('.velmethcheckbox');
velmethcheckboxcheckBoxlayer.change(function () {
    $('#recalculate-button').prop('disabled', velmethcheckboxcheckBoxlayer.filter(':checked').length < 1);
});
$('.velmethcheckbox').change();

$('#advancedreachopt-button').click(function () {
    var x = document.getElementById("advancedreachopt");
    if (x.style.display === "none") {
        x.style.display = "block";
    } else {
        x.style.display = "none";
    }
})

$('[name=dwnl_opt]').click(function () {
    var dwnflag = false;
    $('[name=dwnl_opt]').each(function () {
        if ($(this).is(':checked'))
            dwnflag = true;
    });

    if (dwnflag) {
        $('#layerdownload-button').removeAttr('disabled');
    } else {
        $('#layerdownload-button').attr('disabled', true);
    }
});

$(document).ready(function () {
    var gagebox = $("#frre_adjust");

    gagebox.click(function () {
        if ($(this).is(":checked")) {
            $("#frre_gage").removeAttr("disabled");
        } else {
            $("#frre_gage").attr("disabled", "disabled");
        }
    });
});

window.onload = function () {
    document.getElementById('frre_region').addEventListener('change', function () {
        if ($(this).val() === 'A') {
            document.getElementById("landslopeline").style.display = "block";
            document.getElementById("limeline").style.display = "none";
            document.getElementById("impline").style.display = "none";
            document.getElementById("asoilline").style.display = "none";
        } else if ($(this).val() === 'P') {
            document.getElementById("landslopeline").style.display = "none";
            document.getElementById("limeline").style.display = "block";
            document.getElementById("impline").style.display = "block";
            document.getElementById("asoilline").style.display = "none";
        } else if ($(this).val() === 'B') {
            document.getElementById("landslopeline").style.display = "none";
            document.getElementById("limeline").style.display = "block";
            document.getElementById("impline").style.display = "block";
            document.getElementById("asoilline").style.display = "none";
        } else if ($(this).val() === 'WC') {
            document.getElementById("landslopeline").style.display = "none";
            document.getElementById("limeline").style.display = "none";
            document.getElementById("impline").style.display = "block";
            document.getElementById("asoilline").style.display = "block";
        } else if ($(this).val() === 'EC') {
            document.getElementById("landslopeline").style.display = "block";
            document.getElementById("limeline").style.display = "none";
            document.getElementById("impline").style.display = "none";
            document.getElementById("asoilline").style.display = "block";
        }
    });
}

let saveFile = (strtofile, filename) => {

    let data = strtofile.replace(/\n/g, "\r\n")
    const textToBLOB = new Blob([data], { type: 'text/plain' });
    const sFileName = filename;

    let newLink = document.createElement("a");
    newLink.download = sFileName;

    if (window.webkitURL != null) {
        newLink.href = window.webkitURL.createObjectURL(textToBLOB);
    }
    else {
        newLink.href = window.URL.createObjectURL(textToBLOB);
        newLink.style.display = "none";
        document.body.appendChild(newLink);
    }

    newLink.click();
}

document.addEventListener("DOMContentLoaded", function () {
    var restable = document.getElementById('reservoirtable');
    hot = new Handsontable(restable, {
        rowHeaders: true,
        colHeaders: true,
        colHeaders: ['Stage [ft]', 'Discharge [cfs]', 'Storage [ac ft]'],
        colWidths: 120,
        width: '100%',
        height: 320,
        rowHeights: 23,
        startRows: 30,
        startCols: 3,
    });
});

//ESRI World Map
var Esri_WorldStreetMap = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
var esristreetatt = '';

//ESRI World Topo
var Esri_WorldTopoMap = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
var esritopoatt = '';

//ESRI World Imagery
var Esri_WorldImageryMap = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
var esriimageryatt = '';

//Creation of map tiles
var esristreet = L.tileLayer(Esri_WorldStreetMap, { attribution: esristreetatt });
var esritopo = L.tileLayer(Esri_WorldTopoMap, { attribution: esritopoatt });
var esriimagery = L.tileLayer(Esri_WorldImageryMap, { attribution: esriimageryatt });

// Setting bounds
var southWest = L.latLng(37, -81)
var northEast = L.latLng(41, -74);
var bounds = L.latLngBounds(southWest, northEast);

//Map creation
var map = L.map('map', {
    layers: [esritopo],
    maxBounds: bounds,
    maxBoundsViscosity: 0.9,
    minZoom: 9,
    maxZoom: 18,
    zoomSnap: 0.5,
    updateWhenZooming: false,
    updateWhenIdle: true,
    wheelPxPerZoomLevel: 120,
}).setView([38.85, -77.4], 7);

var loadingControl = L.Control.loading({
    spinjs: true
});
map.addControl(loadingControl);

var nhd_url_mr = 'https://services.arcgis.com/njFNhDsUCentVYJW/ArcGIS/rest/services/GISHydro_NHD_Str_MR/FeatureServer/0';
var nhd_url_hr = 'https://services.arcgis.com/njFNhDsUCentVYJW/ArcGIS/rest/services/GISHydro_NHD_Str_HR/FeatureServer/0';
var gages_url = 'https://services.arcgis.com/njFNhDsUCentVYJW/ArcGIS/rest/services/GISHydro_USGS_Gages/FeatureServer/0';
var roads_url = 'https://geodata.md.gov/imap/rest/services/Transportation/MD_RoadCenterlines/MapServer/2';
var extent_url = 'https://services.arcgis.com/njFNhDsUCentVYJW/ArcGIS/rest/services/GISHydro_Map_Extent/FeatureServer/0';
var infstr30_url = 'https://services.arcgis.com/njFNhDsUCentVYJW/ArcGIS/rest/services/GISHydro_InfStr30/FeatureServer/0';
var infstr10_url = 'https://services.arcgis.com/njFNhDsUCentVYJW/ArcGIS/rest/services/GISHydro_InfStr10/FeatureServer/0';
var prov_url = 'https://services.arcgis.com/njFNhDsUCentVYJW/ArcGIS/rest/services/GISHydro_Hydro_Regions/FeatureServer/0';

var searchControl = L.esri.Geocoding.geosearch({
    zoomToResult: false,
    providers: [
        L.esri.Geocoding.featureLayerProvider({
            url: nhd_url_mr,
            searchFields: ['NAME', 'GNIS_ID'],
            label: 'NHD Streams',
            formatSuggestion: function (feature) {
                return feature.properties.NAME + ' - ' + feature.properties.GNIS_ID;
            }
        }),
        L.esri.Geocoding.featureLayerProvider({
            url: gages_url,
            searchFields: ['GAGE_ID'],
            label: 'Stream Gages',
            formatSuggestion: function (feature) {
                return feature.properties.GAGE_ID + ' - ' + feature.properties.STATE;
            }
        }),
        L.esri.Geocoding.featureLayerProvider({
            url: roads_url,
            searchFields: ['HWYNAME', 'ALT1_NAME'],
            label: 'Roads',
            formatSuggestion: function (feature) {
                return feature.properties.HWYNAME + ' - ' + feature.properties.ALT1_NAME;
            }
        }),
        L.esri.Geocoding.arcgisOnlineProvider(),
    ],
    placeholder: 'Streams, gages, places, or addresses',
}).addTo(map);

L.Control.MousePosition = L.Control.extend({
    options: {
        position: 'bottomleft',
        separator: ' : ',
        emptyString: 'Unavailable',
        lngFirst: false,
        numDigits: 5,
        lngFormatter: undefined,
        latFormatter: undefined,
        prefix: ""
    },

    onAdd: function (map) {
        this._container = L.DomUtil.create('div', 'leaflet-control-mouseposition');
        L.DomEvent.disableClickPropagation(this._container);
        map.on('mousemove', this._onMouseMove, this);
        this._container.innerHTML = this.options.emptyString;
        return this._container;
    },

    onRemove: function (map) {
        map.off('mousemove', this._onMouseMove)
    },

    _onMouseMove: function (e) {
        var lng = this.options.lngFormatter ? this.options.lngFormatter(e.latlng.lng) : L.Util.formatNum(e.latlng.lng, this.options.numDigits);
        var lat = this.options.latFormatter ? this.options.latFormatter(e.latlng.lat) : L.Util.formatNum(e.latlng.lat, this.options.numDigits);
        var value = this.options.lngFirst ? lng + this.options.separator + lat : lat + this.options.separator + lng;
        var prefixAndValue = this.options.prefix + ' ' + value;
        this._container.innerHTML = prefixAndValue;
    }

});

L.Map.mergeOptions({ positionControl: false });

L.Map.addInitHook(function () {
    if (this.options.positionControl) {
        this.positionControl = new L.Control.MousePosition();
        this.addControl(this.positionControl);
    }
});

L.control.mousePosition = function (options) { return new L.Control.MousePosition(options); };


var results = L.featureGroup().addTo(map);
searchControl.on("results", function (data) {
    results.clearLayers();
    for (var i = data.results.length - 1; i >= 0; i--) {
        results.addLayer(L.marker(data.results[i].latlng));
    }
    map.fitBounds(results.getBounds());
});

// create the sidebar instance and add it to the map
var sidebar = L.control.sidebar({
    container: 'sidebar',
    autopan: true,
}).addTo(map).open('home');

sidebar.disablePanel('user_streams');
sidebar.disablePanel('shed_del');
sidebar.disablePanel('basin_properties');
sidebar.disablePanel('subshed');
sidebar.disablePanel('toc');
sidebar.disablePanel('reachselect');
sidebar.disablePanel('wintr20');

if (maintenance_flag){
    sidebar.disablePanel('pjs');
}

//Base layers definition and addition
var baseLayers = {
    "ESRI World Map": esristreet,
    "ESRI World Topo": esritopo,
    "ESRI World Imagery": esriimagery
};

var gagemarkers = {
    radius: 8,
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};

var gagesf = L.esri.featureLayer({
    url: gages_url,
    onEachFeature: function popUp(f, l) {

        l.on('click', function (e) {
            document.getElementById('frre_gage').value = e.target.feature.properties.GAGE_ID;
        });

        var out = [];
        if (f.properties) {
            for (var key in f.properties) {
                if (key == "X" || key == "Y" || key == "EL" || key == "STATE" || key == "DRAINAGE_A" || key == "GAGE_ID") {
                    out.push(key + ": " + f.properties[key]);
                }
            }
            l.bindPopup(out.join("<br />"));
            return new L.circleMarker(l, gagemarkers)
        }
    },
    pointToLayer: function (feature, latlng) {
        return new L.CircleMarker(latlng, { radius: 3, fillColor: "#ff7800" });
    },

});

var roadsf = L.esri.featureLayer({
    url: roads_url,
    style: function (feature) {
        return { color: '#AC1717', weight: 1 };
    }
});

var quadsf = L.esri.featureLayer({
    url: extent_url,
    style: function (feature) {
        return { color: '#606060', weight: 1 };
    }
}).addTo(map);

var infstrf = '';

var nhdf_hr = L.esri.featureLayer({
    url: nhd_url_hr,
    style: function (feature) {
        return { color: 'purple', weight: 1 };
    }
});

function getprovColor(d) {
    if (d == 'A') { return '#CD6155' }
    else if (d == 'P') { return '#2980B9' }
    else if (d == 'B') { return '#27AE60' }
    else if (d == 'E') { return '#F4D03F' }
    else { return "#85929E" }
}

function style4(feature) {
    return {
        fillColor: getprovColor(feature.properties.PROVINCE),
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

var nhdf_mr = L.esri.featureLayer({
    url: nhd_url_mr,
    style: function (feature) {
        return { color: 'blue', weight: 1 };
    }
});

var provf = L.esri.featureLayer({
    url: prov_url,
    style: style4,
    onEachFeature: function popUp(f, l) {
        var out = [];
        if (f.properties) {
            for (var key in f.properties) {
                if (key == "PROVINCE") {
                    out.push(key + ": " + f.properties[key]);
                }
            }
            l.bindPopup(out.join("<br />"));
        }
    }
});


map.on('zoom', function () {
    if (map.getZoom() > 11 && pjs_zoom) {
        if (nhdhrflag) {
            nhdf_hr.addTo(map);
        } else {
            nhdf_mr.addTo(map);
        }
    } else {
        if (nhdhrflag) {
            nhdf_hr.removeFrom(map);
        } else {
            nhdf_mr.removeFrom(map);
        }
    }
    if (map.getZoom() > 14 && pjs_zoom && dataready && cellsize == 30) {
        infstrf.addTo(map);
    } else if (map.getZoom() > 16 && pjs_zoom && dataready && cellsize == 10) {
        infstrf.addTo(map);
    } else if (dataready) {
        infstrf.removeFrom(map);
    }
});

let layerControl = {
    "NHD Streams (MR)": nhdf_mr,
    "NHD Streams (HR)": nhdf_hr,
    "USGS Gages": gagesf,
    "Roads Layer": roadsf,
    "Physiographic Provinces": provf,
}

var LC = L.control.layers(baseLayers, layerControl);
map.spin(true);
setTimeout(function () {
    LC.addTo(map);
    map.spin(false);
}, 1000);

L.control.mousePosition({ position: "bottomleft" }).addTo(map);
L.control.scale({ position: "bottomleft" }).addTo(map);

// Initialise the draw control and pass it the FeatureGroup of editable layers
var drawControl = new L.Control.Draw();
var drawLayers = new L.FeatureGroup();
map.addLayer(drawLayers);
var drawLayers2 = new L.FeatureGroup();
map.addLayer(drawLayers2);
var drawLayers3 = new L.FeatureGroup();
map.addLayer(drawLayers3);

map.on(L.Draw.Event.CREATED, function (e) {
    type = e.layerType;
    layer = e.layer;

    if (type == "rectangle") {
        layer2 = e.layer;
        layer2.setStyle({
            fillColor: 'none',
            weight: 3,
            opacity: 1,
            color: 'red'
        });
        var AOIArea = L.GeometryUtil.geodesicArea(layer2.getLatLngs()[0]);

        AOIArea = AOIArea / (2.59E6)

        if (AOIArea > 1000) {
            alert("Error: Area of Interest is too large, AOI: " + (AOIArea).toFixed(1) + "> 1000 sq. mi.")
        } else {
            drawLayers2.addLayer(layer2);
            map.fitBounds(layer2.getBounds());
            document.getElementById('clearaoi-button').style.display = "block";
            document.getElementById('aoi-button').style.display = "none";
            document.getElementById('usrstroption').style.display = "block";
        }
    }

    if (type == "polyline" && userflag) {
        layer3 = e.layer;
        drawLayers3.addLayer(layer3)
    }


    if (type == "polyline" && !userflag) {
        drawLayers.addLayer(layer)

        // Calculating the distance of the polyline
        var tempLatLng = null;
        totalDistance = 0;
        $.each(e.layer._latlngs, function (i, latlng) {
            if (tempLatLng == null) {
                tempLatLng = latlng;
                return;
            }
            totalDistance += tempLatLng.distanceTo(latlng);
            tempLatLng = latlng;
        });
        var transect_dist = 800;
        if (totalDistance > totalDistance) {
            alert("Transect length is " + (totalDistance).toFixed(2) + " m. Maximum allowable length is " + transect_dist + "m. Please draw it again.")
            drawLayers.clearLayers();
        } else {
            $("#xs_modal").modal()
        };
    }
    else if (type == "marker" && delcheck) {
        drawLayers.addLayer(layer);
        validdelcheck();
    }
    else if (type == "marker" && fpcheck) {
        drawLayers.addLayer(layer);
        flowpaths_polyline();
    }
    else if (type == "marker" && olcheck) {
        drawLayers.addLayer(layer);
        outlets_marker();
    }
    else if (type == "marker" && rscheck) {
        drawLayers.addLayer(layer);
        reservoir()
    }
});

var addasstreams = new L.layerGroup();
addasstreams.addTo(map);
var addasoutlets = new L.layerGroup();
addasoutlets.addTo(map);
var addasreservoirs = new L.layerGroup();
addasreservoirs.addTo(map);

var infstr_sr_layer = L.featureGroup();
map.addLayer(infstr_sr_layer);

var wshed_layer = L.featureGroup();
map.addLayer(wshed_layer);

var infstr_layer = L.featureGroup();
map.addLayer(infstr_layer);

var subshed_layer = L.featureGroup();
map.addLayer(subshed_layer);

var subshed2_layer = L.featureGroup();
map.addLayer(subshed2_layer);

var contourlines = L.featureGroup();
map.addLayer(contourlines);

var landuselyr = L.featureGroup();
map.addLayer(landuselyr);

var soilslyr = L.featureGroup();
map.addLayer(soilslyr);

var longestpathlyr = L.featureGroup();
map.addLayer(longestpathlyr);

var curvenumberlyr = L.featureGroup();
map.addLayer(curvenumberlyr);

function highlightFeaturelu(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 2,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }

    info.update(layer.feature.properties);
}

function highlightFeaturesoils(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 2,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }

    info2.update(layer.feature.properties);
}

function highlightFeaturecn(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 2,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }

    info3.update(layer.feature.properties);
}

function onEachFeaturelu(feature, layer) {
    layer.on({
        mouseover: highlightFeaturelu,
        mouseout: resetHighlightlu,
    });
}

function onEachFeaturesoils(feature, layer) {
    layer.on({
        mouseover: highlightFeaturesoils,
        mouseout: resetHighlightsoils,
    });
}

function onEachFeaturecurvenumber(feature, layer) {
    layer.on({
        mouseover: highlightFeaturecn,
        mouseout: resetHighlightcn,
    });
}

function style(feature) {
    let luhex = feature.properties.CLASS_NAME
    return {
        fillColor: lustyle.CLASS_NAME[luhex.toLowerCase()],
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

function getsoilColor(d) {
    if (d == 1) { return '#CD6155' }
    else if (d == 2) { return '#2980B9' }
    else if (d == 3) { return '#27AE60' }
    else if (d == 4) { return '#F4D03F' }
    else { return "#85929E" }
}

function style2(feature) {
    return {
        fillColor: getsoilColor(feature.properties.gridcode),
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

function getcurvenumberColor(d) {
    return d > 90 ? '#800026' :
        d > 80 ? '#BD0026' :
            d > 70 ? '#E31A1C' :
                d > 60 ? '#FC4E2A' :
                    d > 50 ? '#FD8D3C' :
                        d > 30 ? '#FEB24C' :
                            d > 20 ? '#FED976' :
                                '#FFEDA0';
}

function style3(feature) {
    return {
        fillColor: getcurvenumberColor(feature.properties.gridcode),
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

var highlightfeature = {
    'fillColor': '#3AE5E5',
    'weight': 2,
    'color': 'black',
    'opacity': 1
};

var lugeojson;
function resetHighlightlu(e) {
    lugeojson.resetStyle(e.target);
    info.update();
}

var soilsgeojson;
function resetHighlightsoils(e) {
    soilsgeojson.resetStyle(e.target);
    info2.update();
}

var curvenumbergeojson;
function resetHighlightcn(e) {
    curvenumbergeojson.resetStyle(e.target);
    info3.update();
}

var info = L.control({ position: "bottomright" });
var info2 = L.control({ position: "bottomright" });
var info3 = L.control({ position: "bottomright" });

map.on('overlayadd', function (eo) {
    if (eo.name === basin_lu) {
        info.addTo(map);
    }
    if (eo.name === basin_soil) {
        info2.addTo(map);
    }
    if (eo.name === "Cuve Number") {
        info3.remove();
    }
});
map.on('overlayremove', function (eo) {
    if (eo.name === basin_lu) {
        info.remove();
    }
    if (eo.name === basin_soil) {
        info2.remove();
    }
    if (eo.name === "Cuve Number") {
        info3.remove();
    }
});

$(".custom-file-input").on("change", function () {
    var fileName = $(this).val().split("\\").pop();
    $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
});

$(document).ready(function () {
    var uploadbox = $("#wshed_upl");

    uploadbox.click(function () {
        clearpoint()
        if ($(this).is(":checked")) {
            upllayerflag = true
            $('#pourpoint-button').attr('disabled', 'true');
            $('#pourpoint2-button').attr('disabled', 'true');
            $('#delineate-button').removeAttr('disabled');
            $('#subdivideyes-button').attr('disabled', 'true');
            document.getElementById('delineate-button').innerHTML = 'USE UPLOADED LAYER';
            alert('WARNING: USER WATERSHED SELECTED FOR ANALYSIS')
        } else {
            upllayerflag = false
            $('#delineate-button').attr('disabled', 'true');
            $('#subdivideyes-button').removeAttr('disabled');
            document.getElementById('delineate-button').innerHTML = 'Delineate Watershed';
            alert('USER LAYER UNSELECTED FOR ANALYSIS')
        }
    });
});

var activeMaintenance = document.getElementById('activeMaintenance');
var activeMap = document.getElementById('map');

if (maintenance_flag) {
    activeMaintenance.style.display = 'block';
    activeMap.style.height = '95vh';
}