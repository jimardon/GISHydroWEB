function servercheck() {
    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.DelCheckURL,
        useCors: false,
    });
    var gpTask = gpService.createTask();

    gpTask.run(validdelcheckCallback);

    function validdelcheckCallback(error, response, raw) {
        if (error || maintenance_flag) {
            $("#serverstatus").html('Offline');
            document.getElementById("serverstatus").style.color = "#FF0000";
        } else {
            $("#serverstatus").html('Online');
            document.getElementById("serverstatus").style.color = "#00FF00";
            $("#gpversionid").html("GP Version: " + response.gpversion);
        }
    }
    $("#webversionid").html("WEB Version: " + webversion);
}

function errormsg(errorcode) {
    return "<br></br>For feedback please email the code below to gis@mdot.maryland.gov<br></br>" + errorcode;
}

function alertmodal(title, message, size) {
    document.getElementById("alert-body").style.height = size;
    $("#alertmodaltitle").html(title);
    $("#alertmodalmessage").html(message);
    $("#alertmodal").modal()
}

function resetall() {window.location.reload();}

function apply() {
    map.spin(true);
    if (document.getElementById("usrstr").checked) {
        sidebar.enablePanel('user_streams');
        sidebar.open('user_streams');
    } else {
        sidebar.enablePanel('shed_del');
        sidebar.open('shed_del');
    }
    $('#demselect').attr('disabled', 'true');
    $('#apply-button').attr('disabled', 'true');
    $('#resetall-button').removeAttr('disabled');

    if (document.getElementById("demselect").value == "neddem10") {
        cellsize = 10;
        infstr_url = infstr10_url
    } else {
        cellsize = 30;
        infstr_url = infstr30_url
    }

    if (!document.getElementById("usrstr").checked) {

        infstrf = L.esri.featureLayer({
            url: infstr_url,
            style: function (feature) {
                return {
                    crossOrigin: null,
                    fillColor: '#6666FF',
                    fillOpacity: 0.5,
                    weight: 0
                };
            }
        });

        dataready = true
        LC.addOverlay(infstrf, "Inferred Streams");
    }
    map.spin(false);
};

function aoi_selec() {
    new L.Draw.Rectangle(map, drawControl.options.rectangle).enable();
    userflag = true
    document.getElementById("redoaoi-button").style.display = "block";
};

function clear_aoi() {
    document.getElementById("aoi-button").style.display = "block";
    document.getElementById("clearaoi-button").style.display = "none";
    drawLayers2.clearLayers();
    $('#apply-button').attr('disabled', 'true');
    $('#aoi-button').removeAttr('disabled');
    document.getElementById('usrstroption').style.display = "none";
    userflag = false
};

function usrstr_selec() {

    userstrflag = true;
    new L.Draw.Polyline(map, drawControl.options.polyline).enable();
    streamLayer2 = "(STREAMS ADDED BY USER)"
}

function clear_usrstr() {

    drawLayers3.clearLayers();
    userstrflag = false
    streamLayer2 = ""
}

function redoaoi(){

    infstr_sr_layer.clearLayers()
    LC.removeLayer(infstr_sr_layer);
    apply()

    $('#aoi-button').removeAttr('disabled');
    $('#clearaoi-button').removeAttr('disabled');
    $('#usrstr-button').removeAttr('disabled');
    $('#clearusrstr-button').removeAttr('disabled');
    $('#nrnhd').removeAttr('disabled');
    $('#hrnhd').removeAttr('disabled');
    $('#nonhd').removeAttr('disabled');
    $('#done-button').removeAttr('disabled');

    clearpoint()

    sidebar.disablePanel('shed_del');

}

function burnstr() {
    map.spin(true);

    map.removeLayer(infstr_layer);

    $('#aoi-button').attr('disabled', 'true');
    $('#clearaoi-button').attr('disabled', 'true');
    $('#usrstr-button').attr('disabled', 'true');
    $('#clearusrstr-button').attr('disabled', 'true');
    $('#nrnhd').attr('disabled', 'true');
    $('#hrnhd').attr('disabled', 'true');
    $('#nonhd').attr('disabled', 'true');
    $('#done-button').attr('disabled', 'true');

    extentslayer = JSON.stringify(layer2.toGeoJSON());
    if (userstrflag) {
        strgson = JSON.stringify(drawLayers3.toGeoJSON());
    }

    var nhdopt = 1
    if (document.getElementById("hrnhd").checked) {
        nhdhrflag = true
        nhdopt = 2
    } else if (document.getElementById("nonhd").checked) {
        nhdhrflag = false
        nhdopt = 3
    }

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.UserStreamsURL,
        useCors: false,
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", document.getElementById("proj_name").value);
    gpTask.setParam("dem_layer", document.getElementById("demselect").value);
    gpTask.setParam("extent", extentslayer);
    gpTask.setParam("userflag", userstrflag);
    gpTask.setParam("usrstreams", strgson);
    gpTask.setParam("nhdopt", nhdopt);
    gpTask.setParam("accthr", 6);

    gpTask.run(userstreamsCallback);

    function userstreamsCallback(error, response, raw) {
        if (error) {
            errorcode1 = "e1x50";
            alertmodal("Error", "<b>" + errorcat.delerror.e1x50 + "</b>" + errormsg(errorcode1), "10vh")

            $('#aoi-button').removeAttr('disabled');
            $('#clearaoi-button').removeAttr('disabled');
            $('#usrstr-button').removeAttr('disabled');
            $('#clearusrstr-button').removeAttr('disabled');
            $('#nrnhd').removeAttr('disabled');
            $('#hrnhd').removeAttr('disabled');
            $('#nonhd').removeAttr('disabled');
            $('#done-button').removeAttr('disabled');

            map.spin(false);
            return
        }

        streamLayer = "NHD (MR)"
        if (document.getElementById("hrnhd").checked) {
            streamLayer = "NHD (HR)"
        } else if (document.getElementById("nonhd").checked) {
            streamLayer = "No Stream Selected"
        }

        map.addLayer(infstr_sr_layer);

        infstr_export = response.infstr
        infstr_sr_layer.addLayer(L.geoJson(infstr_export, {
            crossOrigin: null,
            fillColor: '#6666FF',
            fillOpacity: 0.5,
            weight: 0
        }));

        LC.addOverlay(infstr_sr_layer, "Inferred Streams");

        full_project_name = response.foldername

        sidebar.disablePanel('user_streams');
        sidebar.enablePanel('shed_del');
        sidebar.open('shed_del');

        map.spin(false);
    }
}

function validdelcheck() {
    map.spin(true);

    $('#delineate-button').attr('disabled', 'true');
    $('#pourpoint-button').attr('disabled', 'true');
    $('#pourpoint2-button').attr('disabled', 'true');
    $('#cleardel-button').attr('disabled', 'true');

    if (addpointvar) {
        mark_lat = document.getElementById('pp_lat').value
        mark_lon = Math.abs(document.getElementById('pp_lng').value)*-1
    } else {
        mark_lat = layer.getLatLng().lat;
        mark_lon = layer.getLatLng().lng;
        document.getElementById('pp_lng').value = parseFloat(mark_lon).toFixed(6)
        document.getElementById('pp_lat').value = parseFloat(mark_lat).toFixed(6)
    }
    document.getElementById('pp_lng').value = parseFloat(mark_lon).toFixed(6)

    errorcode1 = "e1x10";
    errorcode2 = parseFloat(mark_lon).toFixed(5).replace(".", "").replace("-", "");
    errorcode2 += parseFloat(mark_lat).toFixed(5).replace(".", "");
    errorcode2 += cellsize;

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.DelCheckURL,
        useCors: false,
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("longitude", mark_lon);
    gpTask.setParam("latitude", mark_lat);
    gpTask.setParam("cellsize", cellsize);
    gpTask.setParam("userstreams", userflag);
    if (userflag) {
        gpTask.setParam("foldername", full_project_name);
    }
    gpTask.run(validdelcheckCallback);

    function validdelcheckCallback(error, response, raw) {
        if (error) {
            alertmodal("Error", "<b>" + errorcat.delerror.e1x10 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            document.getElementById("novalidpp").style.display = "block";
            document.getElementById("validpp").style.display = "none";
            document.getElementById("selecpp").style.display = "none";
            $('#cleardel-button').removeAttr('disabled');
            map.spin(false);
            return
        }

        if (response.valid_point) {
            document.getElementById("novalidpp").style.display = "none";
            document.getElementById("validpp").style.display = "block";
            document.getElementById("selecpp").style.display = "none";
            $('#delineate-button').removeAttr('disabled');
            $('#cleardel-button').removeAttr('disabled');
        } else {
            document.getElementById("novalidpp").style.display = "block";
            document.getElementById("validpp").style.display = "none";
            document.getElementById("selecpp").style.display = "none";
            $('#cleardel-button').removeAttr('disabled');
        }

        mark_lat = parseFloat(response.pp_coords[1]).toFixed(6)
        mark_lon = parseFloat(response.pp_coords[0]).toFixed(6)

        document.getElementById('pp_lng').value = parseFloat(mark_lon).toFixed(6)
        document.getElementById('pp_lat').value = parseFloat(mark_lat).toFixed(6)

        if (map.getZoom() < 15) { map.setZoom(15); }
        map.panTo(new L.LatLng(mark_lat, mark_lon));
        layer.setLatLng([mark_lat, mark_lon]).update();
        map.spin(false);
    }
}

function change_delcheck() {
    delcheckin = false;
    data_select();
}

function drawpoint() {
    L.drawLocal.draw.handlers.marker.tooltip.start = "Click map to place pour point"
    drawLayers.clearLayers();
    new L.Draw.Marker(map, drawControl.options.marker).enable();
    delcheckin = true;
    addpointvar = false
}

function addpoint() {
    var longitude = Math.abs(document.getElementById('pp_lng').value)*-1;
    var latitude = document.getElementById('pp_lat').value;
    if (longitude > -75.01 || longitude < -79.62 || latitude > 40.26 || latitude < 37.87) {
        alertmodal("Error", errorcat.delerror.e1x20, "10vh")
    } else {
        addpointvar = true
        layer = L.marker([latitude, longitude]);
        drawLayers.addLayer(layer);
        delcheckin = true;
        validdelcheck()
    }
};

function clearpoint() {
    document.getElementById("validpp").style.display = "none";
    document.getElementById("novalidpp").style.display = "none";
    document.getElementById("selecpp").style.display = "block";
    drawLayers.clearLayers();
    document.getElementById('pp_lat').value = "";
    document.getElementById('pp_lng').value = "";
    $('#cleardel-button').attr('disabled', 'true');
    $('#delineate-button').attr('disabled', 'true');
    $('#pourpoint-button').removeAttr('disabled');
    $('#pourpoint2-button').removeAttr('disabled');
};

function data_select() {
    map.spin(true);

    map.removeLayer(wshed_layer);
    map.removeLayer(infstr_layer);

    wshed_layer.clearLayers()
    infstr_layer.clearLayers()

    $('#proj_name').attr('disabled', 'true');
    $('#soilselect').attr('disabled', 'true');
    $('#landselect').attr('disabled', 'true');
    $('#hyddata').attr('disabled', 'true');
    $('#acc_thres').attr('disabled', 'true');
    $('#delineate-button').attr('disabled', 'true');
    $('#pourpoint-button').attr('disabled', 'true');
    $('#pourpoint2-button').attr('disabled', 'true');
    $('#cleardel-button').attr('disabled', 'true');
    $('#usrstr').attr('disabled', 'true');
    $('#dfltstr').attr('disabled', 'true');

    proj_name = document.getElementById("proj_name").value
    proj_folder = proj_name.replace(/[^a-zA-Z0-9]/g, '_');
    dem_layer = document.getElementById("demselect").value
    soil_layer = document.getElementById("soilselect").value
    land_layer = document.getElementById("landselect").value
    hyd_cond = document.getElementById("hyddata").value
    acc_thr = parseInt(document.getElementById("acc_thres").value)

    basin_lu = 'Unknown';
    basin_soil = 'Unknown';
    if (land_layer == "nlcd2019") { basin_lu = "NLCD (2019)"; landerror = '01'; }
    if (land_layer == "nlcd2016") { basin_lu = "NLCD (2016)"; landerror = '02'; }
    if (land_layer == "nlcd2011") { basin_lu = "NLCD (2011)"; landerror = '03'; }
    if (land_layer == "nlcd2006") { basin_lu = "NLCD (2006)"; landerror = '04'; }
    if (land_layer == "nlcd2001") { basin_lu = "NLCD (2001)"; landerror = '05'; }
    if (land_layer == "mrlc") { basin_lu = "MRLC"; landerror = '06'; }
    if (land_layer == "mdp2010") { basin_lu = "MDP (2010)"; landerror = '07'; }
    if (land_layer == "mdplu2002") { basin_lu = "MDP (2002)"; landerror = '08'; }
    if (land_layer == "lu97m") { basin_lu = "MDP (1997)"; landerror = '09'; }
    if (land_layer == "luult") { basin_lu = "ULTIMATE"; landerror = '10'; }
    if (land_layer == "mdde2002") { basin_lu = "MD/DE (2002)"; landerror = '11'; }
    if (land_layer == "lu70") { basin_lu = "USGS (1970's)"; landerror = '12'; }

    if (soil_layer == "ssurgo_2021") { basin_soil = "SSURGO (Oct 2021)"; soilerror = '01'; }
    if (soil_layer == "ssurgo_2018") { basin_soil = "SSURGO (May 2018)"; soilerror = '02'; }
    if (soil_layer == "ssurgo_old") { basin_soil = "SSURGO (2010's)"; soilerror = '03'; }
    if (soil_layer == "ragan") { basin_soil = "Ragan"; soilerror = '04'; }

    if (hyd_cond == "Good") { hyderror = '01'; }
    if (hyd_cond == "Fair") { hyderror = '02'; }
    if (hyd_cond == "Poor") { hyderror = '03'; }

    errorcode1 = "e1x30"
    errorcode2 += landerror;
    errorcode2 += soilerror;
    errorcode2 += hyderror;
    errorcode2 += acc_thr;

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.DataSelectionURL,
        useCors: false,
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("Project_Name", proj_folder);
    gpTask.setParam("spatref", "4326");
    gpTask.setParam("Coord_X", mark_lon);
    gpTask.setParam("Coord_Y", mark_lat);
    gpTask.setParam("DEM_Layer", dem_layer);
    gpTask.setParam("Soil_Layer", soil_layer);
    gpTask.setParam("Land_Layer", land_layer);
    gpTask.setParam("Hydrologic_Condition", hyd_cond);
    gpTask.setParam("Accumulation_Threshold", acc_thr);
    gpTask.setParam("userstream", userflag)
    if (userflag) {
        gpTask.setParam("foldername", full_project_name)
    }
    if (upllayerflag) {
        gpTask.setParam("uploadedlayer", upllayerflag)
        //gpTask.setParam("inshp", result)
    }

    gpTask.run(dataselectionCallback);

    function dataselectionCallback(error, response, raw) {

        map.addLayer(wshed_layer);
        map.addLayer(infstr_layer);

        if (error) {
            alertmodal("Error", "<b>" + errorcat.delerror.e1x30 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            map.spin(false);
            return
        }

        if (land_layer == "mdp2010" || land_layer == "mdplu2002" || land_layer == "lu97m") {
            alertmodal("Disclaimer", errorcat.generalerror.g1x10, "20vh")
        }

        wshed_export = response.wshed_proj
        wshed_layer.addLayer(L.geoJson(wshed_export, {
            crossOrigin: null,
            fillColor: '#FA6FFA',
            fillOpacity: 0.5,
            color: 'black',
            weight: 2,
        }));
        LC.addOverlay(wshed_layer, "Watershed");

        infstr_export = response.infstr_proj
        infstr_layer.addLayer(L.geoJson(infstr_export, {
            crossOrigin: null,
            fillColor: '#6666FF',
            fillOpacity: 0.5,
            weight: 0
        }));
        LC.addOverlay(infstr_layer, "Inferred Streams");

        if (userflag) {
            map.removeLayer(infstr_sr_layer);
            LC.removeLayer(infstr_sr_layer);
        } else {
            LC.removeLayer(infstrf);
            map.removeLayer(infstrf);
        }

        gagelist = response.gagelist;
        for (var i = 0; i < gagelist.length; i++) {
            var opt = document.createElement('option');
            opt.innerHTML = gagelist[i];
            opt.value = gagelist[i];
            document.getElementById('gagelist').appendChild(opt);
        }

        setTimeout(function () {
            map.fitBounds(wshed_layer.getBounds());
            map.spin(false);
            map.once("moveend zoomend", setwshedextent)
        }, 200);

        function setwshedextent() {
            map.setMinZoom(map.getZoom() - 0.5);
        };

        delcheck = false
        pjs_zoom = false

        full_project_name = response.full_name

        drawLayers.clearLayers();

        if (response.aoicheck < 0.1) {
            alertmodal("Error", errorcat.delerror.e1x40, "30vh")
            $('#proj_name').removeAttr('disabled');
            $('#soilselect').removeAttr('disabled');
            $('#landselect').removeAttr('disabled');
            $('#hyddata').removeAttr('disabled');
            $('#acc_thres').removeAttr('disabled');
            $('#delineate-button').removeAttr('disabled');
            $('#pourpoint-button').removeAttr('disabled');
            $('#pourpoint2-button').removeAttr('disabled');
            $('#cleardel-button').removeAttr('disabled');
            $('#usrstr').removeAttr('disabled');
            $('#dfltstr').removeAttr('disabled');
            LC.removeLayer(wshed_layer);
            LC.removeLayer(infstr_layer);
        } else {
            if(response.aoicheck*90/cellsize < 95){
                alert("Warning: Not all land use cover within the watershed extent (" + parseFloat(response.aoicheck90/cellsize).toFixed(0) + "%)")
            }
            $('#landuse-button').removeAttr('disabled');
            $('#soils-button').removeAttr('disabled');
            $('#curvenumber-button').removeAttr('disabled');
            sidebar.enablePanel('basin_properties');
            sidebar.open('basin_properties');
        }

        if (document.getElementById("dfltstr").checked) {
            streamLayer = "NHD (MR)"
        }

        if (response.extentcheck) { alertmodal("Error", errorcat.delerror.e1x60, "30vh") }
        $('#wshed_dwnl').removeAttr('disabled');
        $('#streams_dwnl').removeAttr('disabled');
        map.spin(false);
    }
}

function redo_del(){

    map.removeLayer(wshed_layer);
    LC.removeLayer(wshed_layer);
    map.removeLayer(infstr_layer);
    LC.removeLayer(infstr_layer);

    delcheck = true
    pjs_zoom = true

    if (userflag) {
        map.addLayer(infstr_sr_layer);
        LC.addOverlay(infstr_sr_layer);
    } else {
        LC.addOverlay(infstrf, "Inferred Streams");
        map.addLayer(infstrf);
    }

    map.setMinZoom(9);

    $('#delineate-button').removeAttr('disabled');
    $('#cleardel-button').removeAttr('disabled');

    $('#wshed_dwnl').attr('disabled', 'true');
    $('#streams_dwnl').attr('disabled', 'true');

    addpoint()

    sidebar.disablePanel('basin_properties');
    sidebar.disablePanel('subshed');
    sidebar.open('shed_del');

    setTimeout(function () {
        wshed_layer.addLayer(L.geoJson(wshed_export, {
            crossOrigin: null,
            fillColor: '#FA6FFA',
            fillOpacity: 0.05,
            color: 'black',
            weight: 1,
        }));
        map.addLayer(wshed_layer);
    }, 200);

    document.getElementById("prop1mods").style.display = "block";
    document.getElementById("prop2mods").style.display = "none";

    $('#basin_properties-button').removeAttr('disabled');
    $('#resetprop-button').removeAttr('disabled');
}

function basin_properties() {
    map.spin(true);

    $('#basin_properties-button').attr('disabled', 'true');
    $('#resetprop-button').attr('disabled', 'true');
    frre_modal = [];

    errorcode1 = "e2x10"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.BasinOutputsURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name);
    gpTask.setParam("landuse", land_layer);
    gpTask.setParam("hyd", hyd_cond);

    gpTask.run(basinpropsCallback);

    function basinpropsCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.basinerror.e2x10 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#basin_properties-button').removeAttr('disabled');
            $('#resetprop-button').removeAttr('disabled');
            map.spin(false);
            return
        }

        var lu_desc = response.lu_desc;
        var soil_acre_lists = response.soil_acre_list;
        var total_area = response.total_area;
        var acres = response.acres;
        var area_percent = response.area_percent;
        var curve_num = response.curve_num;

        html_warning = response.html_warning;
        var x = response.x;
        var y = response.y;
        provstring = response.provstring;
        areami2 = response.areami2;
        var theslope = response.theslope;
        var theslope_feet = response.theslope_feet;
        landslope = response.landslope;
        var UrbPct = response.urbpct;
        IA = response.ia;
        var tc = response.tc;
        var lagtime = response.lagtime;
        var maxlength = response.maxlength;
        var outletelev = response.outletelev;
        var basinrelief = response.basinrelief;
        var avgCN = response.avgcn;
        var FC = response.fc;
        var ST = response.st;
        LI = response.li;
        var pctsoilR = response.pctsoilr;
        var pctsoil = response.pctsoil;
        var p2yr = response.p2yr;
        var maprec = response.maprec;
        var coef_list = response.coef_list;
        var exp_list = response.exp_list;

        asoil = pctsoil[0]

        projectTable0 =
            '<table border="0">' +
            '<col width="300">' +
            '<col width="300">' +
            '<tr><td align="left">GISHydroWEB Release Version:</td><td align="left">' + webversion + '</td></tr>' +
            '<tr><td align="left">Project Name:</td><td align="left">' + proj_name + '</td></tr>' +
            '<tr><td align="left">Project ID:</td><td align="left">' + full_project_name + '</td></tr>' +
            '<tr><td align="left">Analysis Date:</td><td align="left">' + today + '</td></tr>' +
            '</table>';

        projectTable1 =
            '<table border="0" align="center">' +
            '<col width="300">' +
            '<col width="150">' +
            '<col width="150">' +
            '<col width="150">' +
            '<col width="150">' +
            '<tr align="center"><th>Land Use</th><th colspan="4" scope="colgroup">Acres on Indicated Soil Group</th></tr>' +
            '<tr align="center"><th></th><th>A-Soil</th><th>B-Soil</th><th>C-Soil</th><th>D-Soil</th></tr>';
        for (var i = 0; i < lu_desc.length; i++) {
            projectTable1 +=
                '<tr>' +
                '<td>' + lu_desc[i] + '</td>' +
                '<td align="right">' + soil_acre_lists[i][0] + '</td>' +
                '<td align="right">' + soil_acre_lists[i][1] + '</td>' +
                '<td align="right">' + soil_acre_lists[i][2] + '</td>' +
                '<td align="right">' + soil_acre_lists[i][3] + '</td>' +
                '</tr>';
        }
        projectTable1 +=
            '<tr>' +
            '<td><b>Total Area</b></td>' +
            '<td align="right"><b>' + total_area[0] + '</b></td>' +
            '<td align="right"><b>' + total_area[1] + '</b></td>' +
            '<td align="right"><b>' + total_area[2] + '</b></td>' +
            '<td align="right"><b>' + total_area[3] + '</b></td>' +
            '</tr>' +
            '</table><p></p>';

        projectTable2 =
            '<table border="0" align="center">' +
            '<col width="300">' +
            '<col width="150">' +
            '<col width="150">' +
            '<col width="100">' +
            '<col width="100">' +
            '<col width="100">' +
            '<col width="100">' +
            '<tr align="center"><th>Land Use</th><th>Acres</th><th>Percent</th><th>A</th><th>B</th><th>C</th><th>D</th></tr>';
        for (var i = 0; i < lu_desc.length; i++) {
            projectTable2 += '<tr>' +
                '<td>' + lu_desc[i] + '</td>' +
                '<td align="right">' + acres[i] + '</td>' +
                '<td align="right">' + parseFloat(area_percent[i]).toFixed(2) + '</td>' +
                '<td align="right">' + curve_num[i][0] + '</td>' +
                '<td align="right">' + curve_num[i][1] + '</td>' +
                '<td align="right">' + curve_num[i][2] + '</td>' +
                '<td align="right">' + curve_num[i][3] + '</td>' +
                '</tr>';
        }
        projectTable2 += '</table><p></p>';

        var basin_modal = '<div class="modal-dialog modal-lg" style="width:100%">' +
            '<div class="modal-content">' +
            '<div class="modal-header">' +
            '<h4 class="modal-title">Basin Composition</h4>' +
            '</div>' +
            '<div class="modal-body">' +
            projectTable0 +
            '<p></p><p align="center"><b>Distribution of Land Use by Soil Group</b></p>' +
            projectTable1 +
            '<p align="center"><b>Distribution of Land Use by Curve Number</b></p>' +
            projectTable2 +
            '</div>' +
            '<div class="modal-footer" style="justify-content: space-between;">' +
            '<button type="button" class="btn btn-default" onclick=modaltocsv(basin_comp,"' + full_project_name + '_COMP.csv")>Download CSV</button>' +
            '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
            '</div>' +
            '</div>' +
            '</div>';

        $("#basin_comp").html(basin_modal);

        var basin_dem = 'Unknown';

        if (dem_layer == "neddem30") { basin_dem = "NED DEM (May 2018)" }
        if (dem_layer == "neddem10") { basin_dem = "NED DEM (May 2022)" }

        projectTable3 = '<table border="0" align="center">' +
            '<col width="300">' +
            '<col width="300">' +
            '<tr><td align="left">DEM Coverage:</td><td align="left">' + basin_dem + '</td></tr>' +
            '<tr><td align="left">Cell Size:</td><td align="left">' + cellsize + ' meters</td></tr>'

        if (uploadshp_flag) {
            projectTable3 += '<tr><td align="left">Watershed Layer:</td><td align="left">USER UPLOADED WATERSHED</td></tr>'
        }

        projectTable3 += '<tr><td align="left">Stream Layer:</td><td align="left">' + streamLayer + " " + streamLayer2 + '</td></tr>' +
            '<tr><td align="left">Land Use Coverage:</td><td align="left">' + basin_lu + '</td></tr>' +
            '<tr><td align="left">Soil Coverage:</td><td align="left">' + basin_soil + '</td></tr>' +
            '<tr><td align="left">Hydrologic Condition:</td><td align="left">' + hyd_cond + '</td></tr>' +
            '<tr><td align="left">Outlet Easting:</td><td align="left">' + x + ' m (MD Stateplane NAD 1983)' + '</td></tr>' +
            '<tr><td align="left">Outlet Northing:</td><td align="left">' + y + ' m (MD Stateplane NAD 1983)' + '</td></tr>' +
            '</table><p></p>';

        projectTable4 = '<table border="0" align="center">' +
            '<col width="300">' +
            '<col width="300">' +
            '<tr><td align="left">Drainage Area:</td><td align="left">' + areami2 + ' mi<sup>2</sup> (' + parseFloat(areami2 * 640).toFixed(1) + ' ac)</td></tr>' +
            '<tr><td align="left">Channel Slope:</td><td align="left">' + parseFloat(theslope).toFixed(3) + ' ft/mi (' + parseFloat(theslope_feet).toFixed(3) + ' ft/ft)' + '</td></tr>' +
            '<tr><td align="left">Land Slope:</td><td align="left">' + parseFloat(landslope).toFixed(3) + ' ft/ft' + '</td></tr>' +
            '<tr><td align="left">Urban Area:</td><td align="left">' + UrbPct + '%</td></tr>' +
            '<tr><td align="left">Impervious Area:</td><td align="left">' + IA + '%</td></tr>' +
            '</table><p></p>';

        projectTable5 = '<table border="0" align="center">' +
            '<col width="300">' +
            '<col width="300">' +
            '<tr><td align="left">Time of Concentration:</td><td align="left">' + tc + ' hours [W.O. Thomas Jr. Equation]' + '</td></tr>' +
            '<tr><td align="left">Time of Concentration:</td><td align="left">' + lagtime + ' hours  [From SCS Lag Equation * 1.67]' + '</td></tr>' +
            '<tr><td align="left">Longest Flow Path:</td><td align="left">' + maxlength + ' mi</td></tr>' +
            '<tr><td align="left">Outlet Elevation:</td><td align="left">' + outletelev + ' ft (NAVD88)</td></tr>' +
            '<tr><td align="left">Basin Relief:</td><td align="left">' + basinrelief + ' ft</td></tr>' +
            '<tr><td align="left">Average CN:</td><td align="left">' + avgCN + '</td></tr>' +
            '<tr><td align="left">Forest Cover:</td><td align="left">' + FC + '%</td></tr>' +
            '<tr><td align="left">Storage:</td><td align="left">' + ST + '%</td></tr>' +
            '<tr><td align="left">Limestone:</td><td align="left">' + LI + '%</td></tr>' +
            '<tr><td align="left">2-Year 24-hour Precipitation:</td><td align="left">' + p2yr + ' in</td></tr>' +
            '<tr><td align="left">Mean Annual Precipitation:</td><td align="left">' + maprec + ' in</td></tr>' +
            '</table><p></p>';

        projectTable6 = '<table border="0" align="center">' +
            '<col width="300">' +
            '<col width="300">' +
            '<tr><td align="left">A Soils:</td><td align="left">' + pctsoilR[0] + '</td></tr>' +
            '<tr><td align="left">B Soils:</td><td align="left">' + pctsoilR[1] + '</td></tr>' +
            '<tr><td align="left">C Soils:</td><td align="left">' + pctsoilR[2] + '</td></tr>' +
            '<tr><td align="left">D Soils:</td><td align="left">' + pctsoilR[3] + '</td></tr>' +
            '</table><p></p>';

        projectTable7 = '<table border="0" align="center">' +
            '<col width="300">' +
            '<col width="300">' +
            '<tr><td align="left">A Soils:</td><td align="left">' + pctsoil[0] + '</td></tr>' +
            '<tr><td align="left">B Soils:</td><td align="left">' + pctsoil[1] + '</td></tr>' +
            '<tr><td align="left">C Soils:</td><td align="left">' + pctsoil[2] + '</td></tr>' +
            '<tr><td align="left">D Soils:</td><td align="left">' + pctsoil[3] + '</td></tr>' +
            '</table><p></p>';

        btableregion_html = '<table border="0" align="center">' +
            '<col width="300">' +
            '<col width="300">';
        for (var i = 0; i < provstring.length; i++) {
            btableregion_html += '<tr><td align="left">' + provstring[i][0] + ':</td><td align="left">' + provstring[i][1] + '%</td></tr>';
        }
        btableregion_html += '</table><p></p>';

        var basin2_modal = '<div class="modal-dialog modal-lg" style="width:100%">' +
            '<div class="modal-content">' +
            '<div class="modal-header">' +
            '<h4 class="modal-title">Basin Statistics</h4>' +
            '</div>' +
            '<div class="modal-body">' +
            projectTable0 +
            '<p></p><p align="center"><b>Data Selected</b></p>' +
            projectTable3 +
            '<p align="center"><b>Hydrologic Region Distribution</b></p>' +
            btableregion_html +
            '<p align="center"><b>Basin Properties</b></p>' +
            projectTable4 +
            projectTable5 +
            '<p align="center"><b>Selected Soils Data Statistics Percent</b></p>' +
            projectTable6 +
            '<p align="center"><b>SSURGO Soils Data Statistics Percent (used in Regression Equations)</b></p>' +
            projectTable7 +
            '<div align="center"><p style="color:#B21E28;width: 400px;text-align: center;" ><b>' + html_warning + '</b></p></div>' +
            '</div>' +
            '<div class="modal-footer" style="justify-content: space-between;">' +
            '<button type="button" class="btn btn-default" onclick=modaltocsv(basin_stat,"' + full_project_name + '_STATS.csv")>Download CSV</button>' +
            '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
            '</div>' +
            '</div>' +
            '</div>';

        $("#basin_stat").html(basin2_modal);

        document.getElementById("prop1mods").style.display = "none";
        document.getElementById("prop2mods").style.display = "block";

        $('#basincomp-button').removeAttr('disabled');
        $('#basinstats-button').removeAttr('disabled');
        $('#frre-button').removeAttr('disabled');

        document.getElementById("sheet_precipitation").value = p2yr;
        document.getElementById("channel_width_coef").value = coef_list[0];
        document.getElementById("channel_depth_coef").value = coef_list[1];
        document.getElementById("channel_area_coef").value = coef_list[2];
        document.getElementById("channel_width_exp").value = exp_list[0];
        document.getElementById("channel_depth_exp").value = exp_list[1];
        document.getElementById("channel_area_exp").value = exp_list[2];

        sidebar.enablePanel('subshed');
        drawLayers.clearLayers();
        alertmodal("Done", "Basin Properties Calculations Finished", "5vh")

        $('#gagelist').removeAttr('disabled');
        $('#contours-button').removeAttr('disabled');
        $('#contourbase').removeAttr('disabled');
        $('#contourint').removeAttr('disabled');
        $('#dem_dwnl').removeAttr('disabled');
        $('#flowdir_dwnl').removeAttr('disabled');
        $('#flowacc_dwnl').removeAttr('disabled');
        $('#landuse_dwnl').removeAttr('disabled');
        $('#soils_dwnl').removeAttr('disabled');
        $('#cn_dwnl').removeAttr('disabled');

        map.spin(false);

        if (parseFloat(IA) > 10) { alertmodal("Warning", errorcat.basinerror.e2x20, "10vh") }
        if (areami2 > 1 && cellsize == 10) { alertmodal("Warning", errorcat.basinerror.e2x30, "10vh") }
    }
};

function frre_basin() {
    map.spin(true);

    $('#gagelist').attr('disabled', 'true');
    $('#frre-button').attr('disabled', 'true');
    frre_modal = [];

    warning_message = []

    errorcode1 = "e3x10"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.FRREBasinURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name);
    gpTask.setParam("gageid", document.getElementById("gagelist").value);
    gpTask.setParam("landslope", parseFloat(landslope).toFixed(6));
    gpTask.setParam("imp", parseFloat(IA).toFixed(2));
    gpTask.setParam("asoil", parseFloat(asoil).toFixed(2));
    gpTask.setParam("lime", parseFloat(LI).toFixed(2));
    gpTask.setParam("version", document.getElementById("frreversion").value);

    gpTask.run(frre_basinCallback);

    function frre_basinCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.frreerror.e3x10 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#frre-button').removeAttr('disabled');
            $('#gagelist').removeAttr('disabled');
            map.spin(false);
            return
        }

        var it_values = response.it_values;
        var q_list_all = response.q_list_all;
        var Qcfs = response.qcfs;
        regioncount = response.regioncount;
        var frreoutput = response.tasker_all;

        projectTable9 = '<table border="0" align="center">' +
            '<col width="100">' +
            '<col width="100">';
        for (var i = 0; i < it_values.length; i++) {
            projectTable9 += '<tr>' +
                '<td align="left">Q(' + it_values[i] + '):</td>' +
                '<td align="right">' + Qcfs[i] + ' cfs</td>' +
                '</tr>';
        }
        projectTable9 += '</table><p></p>';

        projectTable10 = '<table border="0" align="center">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<tr align="center"><th>Return Period</th>' +
            '<th style="text-align:right;">50</th><th style="text-align:left;">%</th>' +
            '<th style="text-align:right;">67</th><th style="text-align:left;">%</th>' +
            '<th style="text-align:right;">90</th><th style="text-align:left;">%</th>' +
            '<th style="text-align:right;">95</th><th style="text-align:left;">%</th></tr>' +
            '<tr align="center"><th></th>' +
            '<th>lower</th><th>upper</th>' +
            '<th>lower</th><th>upper</th>' +
            '<th>lower</th><th>upper</th>' +
            '<th>lower</th><th>upper</th></tr>';
        for (var i = 0; i < it_values.length; i++) {
            projectTable10 += '<tr>' +
                '<td align="center">' + it_values[i] + '</td>' +
                '<td align="center">' + Math.round(q_list_all[i][0]) + '</td>' +
                '<td align="center">' + Math.round(q_list_all[i][1]) + '</td>' +
                '<td align="center">' + Math.round(q_list_all[i][2]) + '</td>' +
                '<td align="center">' + Math.round(q_list_all[i][3]) + '</td>' +
                '<td align="center">' + Math.round(q_list_all[i][4]) + '</td>' +
                '<td align="center">' + Math.round(q_list_all[i][5]) + '</td>' +
                '<td align="center">' + Math.round(q_list_all[i][6]) + '</td>' +
                '<td align="center">' + Math.round(q_list_all[i][7]) + '</td>' +
                '</tr>';
        }
        projectTable10 += '</table><p></p>';

        for (var j = 0; j < regioncount; j++) {

            const estim_par = frreoutput[j][0];
            warning_message.push(frreoutput[j][1]);
            const cl = frreoutput[j][2];
            const cu = frreoutput[j][3];
            const yhat_list = frreoutput[j][4];
            const sepc_list = frreoutput[j][5];
            const eqyrs_list = frreoutput[j][6];
            const sepred_list = frreoutput[j][7];

            var projectTable11 = '<table border="0" align="center">' +
                '<col width="150">' +
                '<col width="200">';
            for (var i = 0; i < estim_par[0].length; i++) {
                projectTable11 += '<tr>' +
                    '<td align="left">' + estim_par[0][i] + ':</td>' +
                    '<td align="right">' + estim_par[1][i] + '</td>' +
                    '</tr>';
            }
            projectTable11 += '</table><p></p>';

            projectTable11_r.push(projectTable11)

            var projectTable12 = '<table border="0" align="center">' +
                '<col width="70">' +
                '<col width="100">' +
                '<col width="150">' +
                '<col width="150">' +
                '<col width="150">' +
                '<tr align="center"><th>Return Period</th>' +
                '<th>Peak Flow Rate</th>' +
                '<th>Standard Error of Prediction</th>' +
                '<th>Equivalent Years of Record</th>' +
                '<th>Standard Error of Prediction</th></tr>' +
                '<tr align="center"><th></th>' +
                '<th>[cfs]</th>' +
                '<th>[percent]</th>' +
                '<th></th>' +
                '<th>[logs]</th></tr>';
            for (var i = 0; i < it_values.length; i++) {
                projectTable12 += '<tr>' +
                    '<td align="center">' + it_values[i] + '</td>' +
                    '<td align="center">' + yhat_list[i] + '</td>' +
                    '<td align="center">' + sepc_list[i] + '</td>' +
                    '<td align="center">' + eqyrs_list[i] + '</td>' +
                    '<td align="center">' + sepred_list[i] + '</td>' +
                    '</tr>';
            }
            projectTable12 += '</table><p></p>';

            projectTable12_r.push(projectTable12)

            var projectTable13 = '<table border="0" align="center">' +
                '<col width="70">' +
                '<col width="70">' +
                '<col width="70">' +
                '<col width="70">' +
                '<col width="70">' +
                '<col width="70">' +
                '<col width="70">' +
                '<col width="70">' +
                '<col width="70">' +
                '<tr align="center"><th>Return Period</th>' +
                '<th style="text-align:right;">50</th><th style="text-align:left;">%</th>' +
                '<th style="text-align:right;">67</th><th style="text-align:left;">%</th>' +
                '<th style="text-align:right;">90</th><th style="text-align:left;">%</th>' +
                '<th style="text-align:right;">95</th><th style="text-align:left;">%</th></tr>' +
                '<tr align="center"><th></th>' +
                '<th>lower</th><th>upper</th>' +
                '<th>lower</th><th>upper</th>' +
                '<th>lower</th><th>upper</th>' +
                '<th>lower</th><th>upper</th></tr>';
            for (var i = 0; i < it_values.length; i++) {
                projectTable13 += '<tr>' +
                    '<td align="center">' + it_values[i] + '</td>' +
                    '<td align="center">' + cl[i][0] + '</td>' +
                    '<td align="center">' + cu[i][0] + '</td>' +
                    '<td align="center">' + cl[i][1] + '</td>' +
                    '<td align="center">' + cu[i][1] + '</td>' +
                    '<td align="center">' + cl[i][2] + '</td>' +
                    '<td align="center">' + cu[i][2] + '</td>' +
                    '<td align="center">' + cl[i][3] + '</td>' +
                    '<td align="center">' + cu[i][3] + '</td>' +
                    '</tr>';
            }
            projectTable13 += '</table><p></p>';
            projectTable13_r.push(projectTable13)

            var basin3_modal = '<div class="modal-dialog modal-lg" style="width:100%;">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h4 class="modal-title">FRRE Discharge</h4>' +
                '</div>' +
                '<div class="modal-body">' +
                projectTable0 +
                '<table border="0">' +
                '<col width="300">' +
                '<col width="300">' +
                '<tr><td align="left">Hydrologic Region:</td><td align="left">' + provstring[j][0] + '</td></tr>' +
                '<tr><td align="left">Weight of Total Area:</td><td align="left">' + provstring[j][1] + '%</td></tr>' +
                '</table><p></p>' +
                '<p align="center" style="font-size:16px;"><b>' + document.getElementById("frreversion").value + ' Maryland Fixed Region Equations</b></p>' +
                '<p align="center"><b>Peak Flow (Total Area Weighted)</b></p>' +
                projectTable9 +
                '<p align="center"><b>Prediction Intervals (Total Area Weighted)</b></p>' +
                projectTable10 +
                '<p align="center"><b>Hydrologic Region Parameters</b></p>' +
                projectTable11 +
                '<p align="center"><b>Hydrologic Region Flood Frequency Estimates</b></p>' +
                projectTable12 +
                '<p align="center"><b>Hydrologic Region Prediction Intervals</b></p>' +
                projectTable13 +
                '<p align="center" style="color:#B21E28;">'
            for (var i = 0; i < warning_message[j].length; i++) {
                basin3_modal += '<b>' + warning_message[j][i] + '</b><br/>';
            }
            basin3_modal += '</p>' +
                '</div>' +
                '<div class="modal-footer" style="justify-content: space-between;">' +
                '<button type="button" class="btn btn-default" onclick=modaltocsv(frre_mod,"' + full_project_name + '_' + provstring[j][0].replaceAll(' ', '') + '_FRRE.csv")>Download CSV</button>' +
                '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
                '</div>' +
                '</div>' +
                '</div>';

            frre_modal.push(basin3_modal);

            if (region_flag) { $('#regionselect').append('<option value=' + j + '>' + provstring[j][0] + '</option>'); }
        }

        if (regioncount > 1) {
            document.getElementById("regiondisplay").style.display = "block";
        }

        region_flag = false
        $('#frre-button').removeAttr('disabled');
        $('#gagelist').removeAttr('disabled');
        $('#report-button').removeAttr('disabled');
        
        map.spin(false);
        frreregion()
        sidebar.enablePanel('subshed');
    }
};

function frreregion() {
    $("#frre_mod").html(frre_modal[document.getElementById("regionselect").value]);
    $("#frre_mod").modal()
}

function flowpaths() {
    delcheck = false;
    fpcheck = true;
    olcheck = false;
    rscheck = false;
    L.drawLocal.draw.handlers.marker.tooltip.start = "Click map to place flow path"
    new L.Draw.Marker(map, drawControl.options.marker).enable();
    clear_flowpaths = false
};

function clearflowpaths() {
    clear_flowpaths = true
    flowpaths_polyline()  
};

function flowpaths_polyline() {
    map.spin(true);
    $('#flowpath-button').attr('disabled', 'true');
    if (singleshed == true) {
        var centerwshed = wshed_layer.getBounds().getCenter();
        mark_lat = centerwshed.lat;
        mark_lon = centerwshed.lng;
    } else if (clear_flowpaths === false) {
        mark_lat = layer.getLatLng().lat;
        mark_lon = layer.getLatLng().lng;
    } else {
        mark_lat = "";
        mark_lon = "";
    }

    $('#subdivideyes-button').attr('disabled', 'true');
    $('#subdivideno-button').attr('disabled', 'true');

    errorcode1 = "e4x10"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.FlowpathsURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("x", mark_lon)
    gpTask.setParam("y", mark_lat)
    gpTask.setParam("clear_flowpaths", clear_flowpaths)

    gpTask.run(flowpathCallback);

    function flowpathCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.subshederror.e4x10 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#flowpath-button').removeAttr('disabled');
            map.spin(false);
            return
        }

        if (clear_flowpaths) {
            addasstreams.clearLayers();
            $('#clearflowpath-button').attr('disabled', 'true');
            $('#subsheds-button').attr('disabled', 'true');
            $('#outlet-button').attr('disabled', 'true');
            clearoutlets()
        } else {
            if (singleshed == false) {
                addasstreams.addLayer(L.geoJson(response.flowpath, {
                    color: '#00eaff',
                    weight: 2,
                }));
            }
            $('#clearflowpath-button').removeAttr('disabled');
            $('#subsheds-button').removeAttr('disabled');
            $('#outlet-button').removeAttr('disabled');
        }
        drawLayers.clearLayers();
        $('#flowpath-button').removeAttr('disabled');
        map.spin(false);

        if (singleshed == true) {
            subsheds()
        } else if (!redosubshed_flag){
            $('#subdivideyes-button').removeAttr('disabled');
            $('#subdivideno-button').removeAttr('disabled');
        }
        redosubshed_flag = false
    }
};

function outlets() {
    delcheck = false;
    fpcheck = false;
    olcheck = true;
    rscheck = false;
    L.drawLocal.draw.handlers.marker.tooltip.start = "Click map to place an outlet point"
    new L.Draw.Marker(map, drawControl.options.marker).enable();
    clear_outlets = false
}

function clearoutlets() {
    clear_outlets = true
    outlets_marker()
};

function outlets_marker() {
    map.spin(true);
    $('#outlet-button').attr('disabled', 'true');
    $('#subdivideyes-button').attr('disabled', 'true');
    $('#subdivideno-button').attr('disabled', 'true');

    if (clear_outlets === false) {
        mark_lat = layer.getLatLng().lat;
        mark_lon = layer.getLatLng().lng;
    } else {
        mark_lat = "";
        mark_lon = "";
    }

    errorcode1 = "e4x20"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.OutletsURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("x", mark_lon)
    gpTask.setParam("y", mark_lat)
    gpTask.setParam("clear_outlets", clear_outlets)

    gpTask.run(outletCallback);

    function outletCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.subshederror.e4x20 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#outlet-button').removeAttr('disabled');
            map.spin(false);
            return
        }

        if (clear_outlets) {
            addasoutlets.clearLayers();
            $('#clearoutlet-button').attr('disabled', 'true');
        } else {
            if (response.outlet_validation) {
                var marker = L.marker([mark_lat, mark_lon]);
                addasoutlets.addLayer(marker);
                $('#clearoutlet-button').removeAttr('disabled');
                alertmodal("Valid", 'The outlet point selected is <span style="color:green;"><b>VALID</b></span>.', "10vh")
            } else {
                alertmodal("Invalid", 'The outlet point selected is <span style="color:#B21E28;"><b>INVALID</b></span>. Please place the outlet point on a valid stream.', "15vh")
            }
        }
        drawLayers.clearLayers();
        $('#outlet-button').removeAttr('disabled');
        map.spin(false);
    }
}

function subdivide_yes() {

    document.getElementById("subshedyes").style.display = "block";
    document.getElementById("subshedoption").style.display = "none";
    singleshed = false;
}

function subdivide_no() {
    singleshed = true;
    flowpaths_polyline()
}

function redosubshed(){

    redosubshed_flag = true

    $('#flowpath-button').removeAttr('disabled');
    $('#outlet-button').removeAttr('disabled');
    $('#clearflowpath-button').removeAttr('disabled');
    $('#clearoutlet-button').removeAttr('disabled');
    $('#subsheds-button').removeAttr('disabled');

    $('#subdivideyes-button').attr('disabled', 'true');
    $('#subdivideno-button').attr('disabled', 'true');

    sidebar.disablePanel('toc');
    sidebar.open('subshed');

    LC.addOverlay(wshed_layer);
    map.addLayer(wshed_layer);

    map.removeLayer(subshed_layer);
    LC.removeLayer(subshed_layer);
    subshed_layer.clearLayers();

    map.removeLayer(subshed2_layer);
    LC.removeLayer(subshed2_layer);

    $('#subshed_dwnl').attr('disabled', 'true');

    document.getElementById("subshedyes").style.display = "none";
    document.getElementById("subshedoption").style.display = "block";

    subshed_layer.clearLayers();
    subshed2_layer.clearLayers();
    addasstreams.clearLayers();
    addasoutlets.clearLayers();

    clear_flowpaths = true
    singleshed = false
    flowpaths_polyline()  
    clearoutlets()
}

function subsheds() {
    map.spin(true);

    $('#flowpath-button').attr('disabled', 'true');
    $('#outlet-button').attr('disabled', 'true');
    $('#clearflowpath-button').attr('disabled', 'true');
    $('#clearoutlet-button').attr('disabled', 'true');
    $('#subsheds-button').attr('disabled', 'true');

    errorcode1 = "e4x30"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.SubshedsURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("uploadedlayer", upllayerflag)

    gpTask.run(subshedCallback);

    function subshedCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.subshederror.e4x30 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#flowpath-button').removeAttr('disabled');
            $('#outlet-button').removeAttr('disabled');
            $('#clearflowpath-button').removeAttr('disabled');
            $('#clearoutlet-button').removeAttr('disabled');
            $('#subsheds-button').removeAttr('disabled');
            map.spin(false);
            return
        }

        subshed_export = response.subsheds
        subshed_layer.addLayer(L.geoJson(subshed_export, {
            crossOrigin: null,
            fillColor: '#FA6FFA',
            fillOpacity: 0.5,
            color: 'black',
            weight: 2,
        }));

        LC.removeLayer(wshed_layer);
        map.removeLayer(wshed_layer);

        setTimeout(function () {
            map.fitBounds(subshed_layer.getBounds());
            map.spin(false);
        }, 200);
        map.once("moveend zoomend", setwshedextent)
        function setwshedextent() {
            map.setMinZoom(map.getZoom() - 0.5);
        };

        map.addLayer(subshed_layer);
        LC.addOverlay(subshed_layer, "Watershed")

        addasoutlets.clearLayers();
        sidebar.enablePanel('toc');
        sidebar.open('toc');
        $('#subshed_dwnl').removeAttr('disabled');

        $('#subdivideyes-button').removeAttr('disabled');
        $('#subdivideno-button').removeAttr('disabled');

        map.spin(false);
    }
}

function redotc(){

    $('#tc_method').removeAttr('disabled');
    $('#sheet_manning').removeAttr('disabled');
    $('#sheet_precipitation').removeAttr('disabled');
    $('#sheet_length').removeAttr('disabled');
    $('#pavedopt').removeAttr('disabled');
    $('#unpavedopt').removeAttr('disabled');
    $('#channel_manning').removeAttr('disabled');
    $('#channel_width_coef').removeAttr('disabled');
    $('#channel_width_exp').removeAttr('disabled');
    $('#channel_depth_coef').removeAttr('disabled');
    $('#channel_depth_exp').removeAttr('disabled');
    $('#channel_area_coef').removeAttr('disabled');
    $('#channel_area_exp').removeAttr('disabled');
    $('#lfpcorrection').removeAttr('disabled');
    $('#tcapply-button').removeAttr('disabled');
    $('#redosubshed-button').removeAttr('disabled');

    if (reaches > 1) {
        document.getElementById("velmeth_tc").style.display = "none";
        document.getElementById("tc_subarea").style.display = "none";
    };

    $('#lfp_dwnl').attr('disabled', 'true');

    map.addLayer(subshed_layer);
    LC.addOverlay(subshed_layer, "Watershed");

    map.removeLayer(subshed2_layer);
    LC.removeLayer(subshed2_layer);
    subshed2_layer.clearLayers();

    document.getElementById("tcvalue-button").style.display = "none";
    document.getElementById("redotc-button").style.display = "none";
    document.getElementById("tcapply-button").style.display = "block";
    document.getElementById("redosubshed-button").style.display = "block";

    sidebar.disablePanel('wintr20');
    sidebar.disablePanel('reachselect');
    document.getElementById("redorating-button").style.display = "none";

    $("#subtc").empty();
    $("#tcsubarea").empty();
}

function settoc() {
    map.spin(true);

    $('#tc_method').attr('disabled', 'true');
    $('#sheet_manning').attr('disabled', 'true');
    $('#sheet_precipitation').attr('disabled', 'true');
    $('#sheet_length').attr('disabled', 'true');
    $('#pavedopt').attr('disabled', 'true');
    $('#unpavedopt').attr('disabled', 'true');
    $('#channel_manning').attr('disabled', 'true');
    $('#channel_width_coef').attr('disabled', 'true');
    $('#channel_width_exp').attr('disabled', 'true');
    $('#channel_depth_coef').attr('disabled', 'true');
    $('#channel_depth_exp').attr('disabled', 'true');
    $('#channel_area_coef').attr('disabled', 'true');
    $('#channel_area_exp').attr('disabled', 'true');
    $('#lfpcorrection').attr('disabled', 'true');
    $('#tcapply-button').attr('disabled', 'true');
    $('#redosubshed-button').attr('disabled', 'true');

    if(document.getElementById("lfpcorrection").value > 1.0){
        document.getElementById("lfpcorrection").value = 1.0
    }

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.SetTOCURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    var tc_method = document.getElementById("tc_method").value;

    errorcode1 = "e5x10"

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("landuse", land_layer)
    gpTask.setParam("Tc_method", tc_method)
    if (tc_method == 'Velocity Method') {
        gpTask.setParam("Tc_ns", document.getElementById("sheet_manning").value)
        gpTask.setParam("Tc_p", document.getElementById("sheet_precipitation").value)
        gpTask.setParam("Tc_l", document.getElementById("sheet_length").value)
        gpTask.setParam("Tc_paved", document.getElementById("pavedopt").checked)
        gpTask.setParam("Tc_sa", document.getElementById("acc_thres").value)
        gpTask.setParam("Tc_nc", document.getElementById("channel_manning").value)
        gpTask.setParam("Tc_cwcoef", document.getElementById("channel_width_coef").value)
        gpTask.setParam("Tc_cwexp", document.getElementById("channel_width_exp").value)
        gpTask.setParam("Tc_cdcoef", document.getElementById("channel_depth_coef").value)
        gpTask.setParam("Tc_cdexp", document.getElementById("channel_depth_exp").value)
        gpTask.setParam("Tc_cacoef", document.getElementById("channel_area_coef").value)
        gpTask.setParam("Tc_caexp", document.getElementById("channel_area_exp").value)
        gpTask.setParam("lfp_correction", document.getElementById("lfpcorrection").value)
    }

    gpTask.run(settocCallback);

    function settocCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.settocerror.e5x10 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#tc_method').removeAttr('disabled');
            $('#sheet_manning').removeAttr('disabled');
            $('#sheet_precipitation').removeAttr('disabled');
            $('#sheet_length').removeAttr('disabled');
            $('#pavedopt').removeAttr('disabled');
            $('#unpavedopt').removeAttr('disabled');
            $('#channel_manning').removeAttr('disabled');
            $('#channel_width_coef').removeAttr('disabled');
            $('#channel_width_exp').removeAttr('disabled');
            $('#channel_depth_coef').removeAttr('disabled');
            $('#channel_depth_exp').removeAttr('disabled');
            $('#channel_area_coef').removeAttr('disabled');
            $('#channel_area_exp').removeAttr('disabled');
            $('#lfpcorrection').removeAttr('disabled');
            $('#tcapply-button').removeAttr('disabled');
            $('#redosubshed-button').removeAttr('disabled');
            map.spin(false);
            return
        }

        AvgArea_ = response.avgarea
        Tot_Time_ = response.tot_time
        reachcount = response.reach_check

        map.removeLayer(subshed_layer);
        LC.removeLayer(subshed_layer);
        subshed_export = response.subshed_edit
        subshed2_layer.addLayer(L.geoJson(subshed_export, { onEachFeature: forEachFeature, style: stylefeature }));
        LC.addOverlay(subshed2_layer, "Watershed")
        map.addLayer(subshed2_layer);

        if (tc_method == "Velocity Method") {

            $('#longestpath-button').removeAttr('disabled');

            Pixel_ = response.pixel
            Type_ = response.type
            Mixed_ = response.mixed
            Elev_ = response.elev
            Slope_ = response.slope
            Width_ = response.width
            Depth_ = response.depth
            Xarea_ = response.xarea
            Tot_Length_ = response.tot_length
            Vel_ = response.vel
            I_Time_ = response.i_time

            reaches = Pixel_.length;
            for (var i = 0; i < reaches; i++) {

                var opt = document.createElement('option');
                opt.innerHTML = i + 1;
                opt.value = i + 1;
                document.getElementById('subtc').appendChild(opt);

                var opt3 = document.createElement('option');
                opt3.innerHTML = i + 1;
                opt3.value = i + 1;
                document.getElementById('tcsubarea').appendChild(opt3);

                var element = document.createElement("div");
                element.setAttribute("class", "modal fade");
                element.setAttribute("id", "tc_modal" + String(i + 1));
                element.setAttribute("role", "dialog");

                var tcmodal = document.getElementById("tocmodal");
                tcmodal.appendChild(element);

                createtctable(i, Pixel_[i], Type_[i], Elev_[i], Slope_[i], AvgArea_[i], Width_[i], Depth_[i], Xarea_[i], Tot_Length_[i], Vel_[i], I_Time_[i], Tot_Time_[i])

                t_temp.push(Type_[i].slice(0));
                e_temp.push(Elev_[i].slice(0));
                s_temp.push(Slope_[i].slice(0));
                a_temp.push(AvgArea_[i].slice(0));
                w_temp.push(Width_[i].slice(0));
                d_temp.push(Depth_[i].slice(0));
                x_temp.push(Xarea_[i].slice(0));
                tl_temp.push(Tot_Length_[i].slice(0));
                v_temp.push(Vel_[i].slice(0));
                it_temp.push(I_Time_[i].slice(0));
                tt_temp.push(Tot_Time_[i].slice(0));

                t_.push(Type_[i].slice(0));
                tt_.push(Tot_Time_[i].slice(0));

                usertcchange.push(tt_[i][tt_[i].length - 1])
            }
            if (reaches > 1) {
                document.getElementById("velmeth_tc").style.display = "block";
                document.getElementById("tc_subarea").style.display = "block";
            };

            $('#lfp_dwnl').removeAttr('disabled');

        } else {

            var tctable_html = '<table border="0" align="center">';
            tctable_html += '<col width="100">';
            tctable_html += '<col width="100">';
            tctable_html += '<col width="100">';
            tctable_html += '<tr align="center"><th>Subwatershed</th>';
            tctable_html += '<th>Drainage Area</th>';
            tctable_html += '<th>Time of Concentration</th></tr>';
            tctable_html += '<tr align="center"><th></th>';
            tctable_html += '<th>[mi<sup>2</sup>]</th>';
            tctable_html += '<th>[hr]</th></tr>';
            for (var i = 0; i < Tot_Time_.length; i++) {
                tctable_html += '<tr>';
                tctable_html += '<td align="center">' + String(i + 1) + '</td>';
                tctable_html += '<td align="center">' + AvgArea_[i] + '</td>';
                tctable_html += '<td align="center">' + Tot_Time_[i] + '</td>';
                tctable_html += '</tr>';

                var opt3 = document.createElement('option');
                opt3.innerHTML = i + 1;
                opt3.value = i + 1;
                document.getElementById('tcsubarea').appendChild(opt3);
            }
            tctable_html += '</table><p></p>';

            var tc_modal = '<div class="modal-dialog" style="width:100%">';
            tc_modal += '<div class="modal-content">';
            tc_modal += '<div class="modal-header">';
            tc_modal += '<h4 class="modal-title">' + tc_method + '</h4>';
            tc_modal += '</div>'
            tc_modal += '<div class="modal-body" style="height:250px;">';
            tc_modal += tctable_html
            tc_modal += '</div>';
            tc_modal += '<div class="modal-footer" style="justify-content: space-between;">';
            tc_modal += '<button type="button" class="btn btn-default" onclick=modaltocsv(toc_mod,"' + full_project_name + '_tc.csv")>Download CSV</button>'
            tc_modal += '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>';
            tc_modal += '</div>';
            tc_modal += '</div>';
            tc_modal += '</div>';

            usertcchange = Tot_Time_

            $("#toc_mod").html(tc_modal);

        }

        userdachange = JSON.parse(JSON.stringify(response.subarealist));
        userdachange_perm = JSON.parse(JSON.stringify(response.subarealist));

        usercnchange = JSON.parse(JSON.stringify(response.cnlist));
        usercnchange_perm = JSON.parse(JSON.stringify(response.cnlist));

        document.getElementById("tcvalue-button").style.display = "block";
        document.getElementById("redotc-button").style.display = "block";
        document.getElementById("tcapply-button").style.display = "none";
        document.getElementById("redosubshed-button").style.display = "none";

        alertmodal("Done", 'Time of concentration estimated. Move to the next tab or check the computed Time of Concentration estimates for the current method by clicking on <b>Tc Values</b>', "13vh")

        if (reachcount < 1) {
            sidebar.enablePanel('wintr20');
        } else {
            sidebar.enablePanel('reachselect');
            document.getElementById("redorating-button").style.display = "block";
        }
        map.spin(false);
    }
}

function createtctable(subarea, Pixel, Type, Elev, Slope, AvgArea, Width, Depth, Xarea, Tot_Length, Vel, I_Time, Tot_Time) {
    var tc_method = document.getElementById("tc_method").value;

    var tctable_html = '<table border="0" align="center">';
    tctable_html += '<col width="150">';
    tctable_html += '<col width="150">';
    tctable_html += '<col width="150">';
    tctable_html += '<col width="150">';
    tctable_html += '<col width="150">';
    tctable_html += '<col width="150">';
    tctable_html += '<col width="150">';
    tctable_html += '<col width="150">';
    tctable_html += '<col width="150">';
    tctable_html += '<col width="150">';
    tctable_html += '<col width="150">';
    tctable_html += '<col width="150">';
    tctable_html += '<tr align="center"><th>Pixel</th>';
    tctable_html += '<th>Type</th>';
    tctable_html += '<th>Elev</th>';
    tctable_html += '<th>Slope</th>';
    tctable_html += '<th>Area</th>';
    tctable_html += '<th>Width</th>';
    tctable_html += '<th>Depth</th>';
    tctable_html += '<th>XS</th>';
    tctable_html += '<th>Length</th>';
    tctable_html += '<th>V</th>';
    tctable_html += '<th>dt</th>';
    tctable_html += '<th>Tc</th></tr>';
    tctable_html += '<tr align="center"><th></th>';
    tctable_html += '<th></th>';
    tctable_html += '<th>[ft]</th>';
    tctable_html += '<th>[ft/ft]</th>';
    tctable_html += '<th>[mi<sup>2</sup>]</th>';
    tctable_html += '<th>[ft]</th>';
    tctable_html += '<th>[ft]</th>';
    tctable_html += '<th>[ft<sup>2</sup>]</th>';
    tctable_html += '<th>[ft]</th>';
    tctable_html += '<th>[ft/s]</th>';
    tctable_html += '<th>[hr]</th>';
    tctable_html += '<th>[hr]</th></tr>';
    for (var j = 0; j < Pixel.length; j++) {
        tctable_html += '<tr>';
        tctable_html += '<td align="center">' + Pixel[j] + '</td>';
        tctable_html += '<td align="center">' + Type[j] + '</td>';
        tctable_html += '<td align="center">' + parseFloat(Elev[j]).toFixed(1) + '</td>';
        tctable_html += '<td align="center">' + parseFloat(Slope[j]).toFixed(6) + '</td>';
        tctable_html += '<td align="center">' + parseFloat(AvgArea[j]).toFixed(6) + '</td>';
        if (Width[j] == "-1") {
            tctable_html += '<td align="center">-</td>';
            tctable_html += '<td align="center">-</td>';
            tctable_html += '<td align="center">-</td>';
        } else {
            tctable_html += '<td align="center">' + Width[j] + '</td>';
            tctable_html += '<td align="center">' + Depth[j] + '</td>';
            tctable_html += '<td align="center">' + Xarea[j] + '</td>';
        }

        tctable_html += '<td align="center">' + parseFloat(Tot_Length[j]).toFixed(1) + '</td>';
        tctable_html += '<td align="center">' + parseFloat(Vel[j]).toFixed(3) + '</td>';
        tctable_html += '<td align="center">' + parseFloat(I_Time[j]).toFixed(4) + '</td>';
        tctable_html += '<td align="center">' + parseFloat(Tot_Time[j]).toFixed(4) + '</td>';
        tctable_html += '</tr>';
    }
    tctable_html += '</table><p></p>';

    var tc_modal = '<div class="modal-dialog modal-lg" style="width:100%">';
    tc_modal += '<div class="modal-content">';
    tc_modal += '<div class="modal-header">';
    tc_modal += '<h4 class="modal-title">' + tc_method + ' ID: ' + String(subarea + 1) + '</h4>';
    tc_modal += '</div>'
    tc_modal += '<div class="modal-body">';
    tc_modal += tctable_html
    tc_modal += '</div>';
    tc_modal += '<div class="modal-footer" style="justify-content: space-between;">';
    tc_modal += '<button type="button" class="btn btn-default" onclick=modaltocsv(tc_modal' + String(subarea + 1) + ',"' + full_project_name + '_velmeth_' + String(subarea + 1) + '.csv")>Download CSV</button>'
    tc_modal += '<button type="button" class="btn btn-default" data-dismiss="modal" onclick=goback()>Go Back</button>';
    tc_modal += '</div>';
    tc_modal += '</div>';
    tc_modal += '</div>';

    $("#tc_modal" + String(subarea + 1)).html(tc_modal);
}

function changetcmodal(typetc, tottimetc) {

    var occcounts = {}
    typetc.forEach(function (x) { occcounts[x] = (occcounts[x] || 0) + 1; });
    occcounts['overland'] = isNaN(occcounts['overland']) ? 0 : occcounts['overland'];
    occcounts['swale'] = isNaN(occcounts['swale']) ? 0 : occcounts['swale'];
    occcounts['channel'] = isNaN(occcounts['channel']) ? 0 : occcounts['channel'];

    document.getElementById("vmsubarea").value = String(document.getElementById("subtc").value);
    document.getElementById("vmtotaltime").value = parseFloat(tottimetc[tottimetc.length - 1]).toFixed(3)
    document.getElementById("vmoltt").value = parseFloat(tottimetc[occcounts['overland'] - 1]).toFixed(3)
    document.getElementById("vmswtt").value = parseFloat(tottimetc[tottimetc.length - occcounts['channel'] - 1] - tottimetc[occcounts['overland'] - 1]).toFixed(3)
    document.getElementById("vmchtt").value = parseFloat(tottimetc[tottimetc.length - 1] - tottimetc[tottimetc.length - occcounts['channel'] - 1]).toFixed(3)
    document.getElementById("vmolseg").value = occcounts['overland']
    document.getElementById("vmswseg").value = occcounts['swale']
    document.getElementById("vmchseg").value = occcounts['channel']
}

function showtc() {
    var tc_method = document.getElementById("tc_method").value;

    $("#subreachno").html(String(document.getElementById("subtc").value));

    if (tc_method == 'Velocity Method') {

        subid = String(document.getElementById("subtc").value);
        changetcmodal(t_[subid - 1], tt_[subid - 1])

        usertcchange[subid - 1] = tt_[subid - 1][tt_[subid - 1].length - 1]

        $("#vm_modal").modal()

    } else {
        $("#toc_mod").modal()
    }
}

function showpx() {
    $('#tc_modal' + subid).modal()
    $("#vm_modal").modal('toggle')
}

function goback() {
    $("#vm_modal").modal()
}

function resettc() {

    var subarea = document.getElementById("subtc").value - 1

    t_temp[subarea] = Type_[subarea].slice(0);
    e_temp[subarea] = Elev_[subarea].slice(0);
    s_temp[subarea] = Slope_[subarea].slice(0);
    a_temp[subarea] = AvgArea_[subarea].slice(0);
    w_temp[subarea] = Width_[subarea].slice(0);
    d_temp[subarea] = Depth_[subarea].slice(0);
    x_temp[subarea] = Xarea_[subarea].slice(0);
    tl_temp[subarea] = Tot_Length_[subarea].slice(0);
    v_temp[subarea] = Vel_[subarea].slice(0);
    it_temp[subarea] = I_Time_[subarea].slice(0);
    tt_temp[subarea] = Tot_Time_[subarea].slice(0);

    t_[subarea] = Type_[subarea].slice(0);
    tt_[subarea] = Tot_Time_[subarea].slice(0);

    changetcmodal(t_[subarea], tt_[subarea])
    createtctable(subarea, Pixel_[subarea], Type_[subarea], Elev_[subarea], Slope_[subarea], AvgArea_[subarea], Width_[subarea], Depth_[subarea], Xarea_[subarea], Tot_Length_[subarea], Vel_[subarea], I_Time_[subarea], Tot_Time_[subarea])

    usertcchange[subarea] = tt_[subarea][tt_[subarea].length - 1]
}

function xs_add() {
    drawLayers.clearLayers();
    L.drawLocal.draw.handlers.polyline.tooltip.start = "Draw a cross section"
    new L.Draw.Polyline(map, drawControl.options.polyline).enable();
}

function selectallprecip() {
    var j = 0;
    var checkboxes = document.getElementsByName('precepcheck');
    for (var i = 0, n = checkboxes.length; i < n; i++) {
        if (checkboxes[i].checked) {
            j++
        }
    }
    for (var i = 0, n = checkboxes.length; i < n; i++) {
        if (j > 0) {
            checkboxes[i].checked = false
        } else {
            checkboxes[i].checked = true
        }
    }
}

function transect() {
    map.spin(true);
    var polylat = []
    var polylon = []
    var arrayOfPoints = layer.getLatLngs();
    for (var i = 0, n = arrayOfPoints.length; i < n; i++) {
        polylat.push(arrayOfPoints[i].lat)
        polylon.push(arrayOfPoints[i].lng)
    };

    $('#addxs-button').attr('disabled', 'true');
    $('#addreservoir-button').attr('disabled', 'true');

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.TransectURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    var user_rs = document.getElementById('reach_slope').value
    var user_be = document.getElementById('bf_elev').value
    var user_cw = document.getElementById('bf_width').value
    var user_cd = document.getElementById('bf_depth').value

    errorcode1 = "e6x10"

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("getlon", JSON.stringify(polylon))
    gpTask.setParam("getlat", JSON.stringify(polylat))
    gpTask.setParam("nmain_val", document.getElementById('xsmain_manning').value)
    gpTask.setParam("nleft_val", document.getElementById('xsleft_manning').value)
    gpTask.setParam("n_right_val", document.getElementById('xsright_manning').value)
    if (isNaN(user_rs) === false && user_rs) { gpTask.setParam("user_rs", user_rs) }
    if (isNaN(user_be) === false && user_be) { gpTask.setParam("user_be", user_be) }
    if (isNaN(user_cw) === false && user_cw) { gpTask.setParam("user_cw", user_cw) }
    if (isNaN(user_cd) === false && user_cd) { gpTask.setParam("user_cd", user_cd) }

    gpTask.run(transectCallback);

    function transectCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.ratingerror.e6x10 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#addxs-button').removeAttr('disabled');
            $('#addreservoir-button').removeAttr('disabled');
            map.spin(false);
            return
        }

        if (response.xs_validation === false) {
            alertmodal("Invalid", errorcat.ratingerror.e6x20, "10vh")
        } else {
            plot_data = response.plot_data
            ratingtype = response.ratingtype
            minstage = response.minstage
            reachno = response.reachno
            ratingdata = response.ratingdata

            $("#tlw").html('<strong>' + parseFloat(totalDistance).toFixed(2) + ' ft</strong>');
            $("#maxelev").html('<strong>' + response.twe_max + ' ft</strong>');
            $("#minelev").html('<strong>' + response.twe_min + ' ft</strong>');
            $("#uda").html('<strong>' + response.areami2_usda + ' mi<sup>2</sup></strong>');
            $("#rslp").html('<strong>' + response.reachslope + ' ft</strong>');
            $("#bfelev").html('<strong>' + minstage + ' ft</strong>');
            $("#bcw").html('<strong>' + response.wbf + ' ft</strong>');
            $("#bcd").html('<strong>' + response.dbf + ' ft</strong>');
            $("#xsplotreachno").html(reachno);
            $("#xsinforeachno").html(reachno);

            document.getElementById("xs_output").style.display = "block";
            document.getElementById("rating_method").style.display = "none";

            transectLayers[`transectline-${reachno}`] = new L.polyline(arrayOfPoints);
            map.addLayer(transectLayers[`transectline-${reachno}`]);
        }
        drawLayers.clearLayers();
        map.spin(false);
        $('#addxs-button').removeAttr('disabled');
        $('#addreservoir-button').removeAttr('disabled');
        $('#xs_dwnl').removeAttr('disabled');        
    }
}

function xsplot_modal() {
    google.charts.load('current', { packages: ['corechart'] }).then(function () {

        $("#xsplot_modal").on('shown.bs.modal', function () {
            var data = new google.visualization.DataTable();
            data.addColumn('number', 'X');
            data.addColumn('number', 'Elevation');

            var datax = plot_data[0]
            var datay = plot_data[1]

            var datainput = []
            for (var i = 0, n = plot_data[0].length; i < n; i++) {
                datainput.push(Array(datax[i], datay[i]))
            };
            data.addRows(datainput);

            var options = {
                height: 500,
                legend: 'none',
                hAxis: { title: 'Distance [ft]' },
                vAxis: { title: 'Elevation [ft]' }
            };
            var chart = new google.visualization.AreaChart(document.getElementById('chart_div_xs'));

            // Wait for the chart to finish drawing before calling the getImageURI() method.
            google.visualization.events.addListener(chart, 'ready', function () {
                chart_div_xs.innerHTML = '<img src="' + chart.getImageURI() + '">';
                console.log(chart_div_xs.innerHTML);
            });
            chart.draw(data, options);
        });
    });
    $("#xsplot_modal").modal()
}

function redoreach() {
    document.getElementById("xs_output").style.display = "none";
    document.getElementById("rating_method").style.display = "block";
    map.removeLayer(transectLayers[`transectline-${reachno}`]);
}

function applyxsreach() {
    document.getElementById("xs_output").style.display = "none";
    document.getElementById("rating_method").style.display = "block";
    totalrating[reachno - 1] = ratingdata
    totalreach[reachno - 1] = reachno
    totaltype[reachno - 1] = ratingtype
    totalstage[reachno - 1] = minstage
    var filtered = totalreach.filter(Boolean);
    if (filtered.length == reachcount) {
        alertmodal("Done", "Reach control complete", "10vh")
        sidebar.enablePanel('wintr20');
        sidebar.open('wintr20');
    } else {
        alertmodal("Done", "Transect added", "10vh")
    }
}

function reservoir_add() {
    delcheck = false;
    fpcheck = false;
    olcheck = false;
    rscheck = true;
    L.drawLocal.draw.handlers.polyline.tooltip.start = "Click map to place a reservoir"
    new L.Draw.Marker(map, drawControl.options.marker).enable();
}

function reservoir() {
    map.spin(true);
    mark_lat = layer.getLatLng().lat;
    mark_lon = layer.getLatLng().lng;

    $('#addxs-button').attr('disabled', 'true');
    $('#addreservoir-button').attr('disabled', 'true');

    errorcode1 = "e6x30"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.ReservoirURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("getlon", mark_lon)
    gpTask.setParam("getlat", mark_lat)

    gpTask.run(transectCallback);

    function transectCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.ratingerror.e6x30 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#addxs-button').removeAttr('disabled');
            $('#addreservoir-button').removeAttr('disabled');
            map.spin(false);
            return
        }

        ratingtype = response.ratingtype
        reachno = response.rating
        minstage = response.reservoir_elev

        if (response.validate_reservoir) {
            $("#reservoir_modal").modal()
            $("#structreachno").html(reachno);
            $("#structelev").html(minstage);
            $("#resinforeachno").html(reachno);
            $("#resplotreachno").html(reachno);
        } else {
            alertmodal("Invalid", errorcat.ratingerror.e6x40, "10vh")
            drawLayers.clearLayers();
        }
        map.spin(false);
        $('#addxs-button').removeAttr('disabled');
        $('#addreservoir-button').removeAttr('disabled');
    }
}

function applyresreach() {
    document.getElementById("reservoir_output").style.display = "none";
    document.getElementById("rating_method").style.display = "block";
    totalrating[reachno - 1] = ratingdata
    totalreach[reachno - 1] = reachno
    totaltype[reachno - 1] = ratingtype
    totalstage[reachno - 1] = minstage
    drawLayers.clearLayers();
    var filtered = totalreach.filter(Boolean);
    if (filtered.length == reachcount) {
        alertmodal("Done", "Reach control complete", "10vh")
        sidebar.enablePanel('wintr20');
        sidebar.open('wintr20');
    } else {
        alertmodal("Done", "Reservoir added", "10vh")
    }
}

function redores() {
    drawLayers.clearLayers();
    document.getElementById("reservoir_output").style.display = "none";
    document.getElementById("rating_method").style.display = "block";
}

function resmodaladd() {
    document.getElementById("reservoir_output").style.display = "block";
    document.getElementById("rating_method").style.display = "none";
    tabledata = hot.getData()
    ratingdata = tabledata.filter(element => element.join("") != "");
}

function resplot_modal() {
    google.charts.load('current', { packages: ['corechart'] }).then(function () {

        $("#resplot_modal").on('shown.bs.modal', function () {
            var data = new google.visualization.DataTable();
            data.addColumn('number', 'X');
            data.addColumn('number', 'Discharge [cfs]');
            data.addColumn('number', 'Storage [ac-ft]');

            var datainput = []
            for (var i = 0, n = tabledata.length; i < n; i++) {
                if (Number(tabledata[i][0]) != 0) {
                    datainput.push(Array(Number(tabledata[i][0]), Number(tabledata[i][1]), Number(tabledata[i][2])))
                }
            };
            data.addRows(datainput);

            var options = {
                height: 500,
                legend: { position: 'bottom' },
                hAxis: {
                    title: 'Elevation [ft]',
                    viewWindow: {
                        min: Number(datainput[0][0]),
                        max: Number(datainput[datainput.length - 1][0])
                    },
                },
                vAxis: { title: 'Flow-Storage [ft]' },
                colors: ['#0000FF', '#B21E28']
            };
            var chart = new google.visualization.LineChart(document.getElementById('chart_div_res'));

            // Wait for the chart to finish drawing before calling the getImageURI() method.
            google.visualization.events.addListener(chart, 'ready', function () {
                chart_div_res.innerHTML = '<img src="' + chart.getImageURI() + '">';
                console.log(chart_div_res.innerHTML);
            });
            chart.draw(data, options);
        });
    });
    $("#resplot_modal").modal()
}

function ratingtable() {

    var rating_html = '<table border="0" align="center">';
    rating_html += '<col width="100">';
    rating_html += '<col width="100">';
    rating_html += '<col width="100">';
    rating_html += '<tr align="center"><th>Stage</th>';
    rating_html += '<th>Discharge</th>';
    rating_html += '<th>Area</th></tr>';
    rating_html += '<tr align="center"><th>[ft]</th>';
    rating_html += '<th>[cfs]</th>';
    rating_html += '<th>[ft<sup>2</sup>]</th></tr>';
    for (var i = 0; i < ratingdata.length; i++) {
        rating_html += '<tr>';
        rating_html += '<td align="center">' + ratingdata[i][0] + '</td>';
        rating_html += '<td align="center">' + ratingdata[i][1] + '</td>';
        rating_html += '<td align="center">' + ratingdata[i][2] + '</td>';
        rating_html += '</tr>';
    }
    rating_html += '</table><p></p>';

    var rating_modal = '<div class="modal-dialog" style="width:100%">';
    rating_modal += '<div class="modal-content">';
    rating_modal += '<div class="modal-header">';
    rating_modal += '<h4 class="modal-title">Rating Table ID: ' + reachno + '</h4>';
    rating_modal += '</div>'
    rating_modal += '<div class="modal-body">';
    rating_modal += rating_html
    rating_modal += '</div>';
    rating_modal += '<div class="modal-footer" style="justify-content: space-between;">';
    rating_modal += '<button type="button" class="btn btn-default" onclick=modaltocsv(rating_mod,"' + full_project_name + '_ratingtable_' + reachno + '.csv")>Download CSV</button>'
    rating_modal += '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>';
    rating_modal += '</div>';
    rating_modal += '</div>';
    rating_modal += '</div>';

    $("#rating_mod").html(rating_modal);
    $("#rating_mod").modal()

}

function redorating(){

    totalrating = []
    totalreach = []
    totaltype = []
    totalstage = []

    map.removeLayer(transectLayers);
    transectLayers.clearLayers();

    drawLayers.clearLayers();

    sidebar.enablePanel('reachselect');
    sidebar.open('reachselect');
    sidebar.disablePanel('wintr20');

    document.getElementById("tr20input").style.display = "none";
    $('#precipitation-button').removeAttr('disabled');
    document.getElementById("createwintr20-button").style.display = "none";
    document.getElementById("downloadwintr20error-button").style.display = "none";
    document.getElementById("downloadwintr20input-button").style.display = "none";
    document.getElementById("downloadwintr20output-button").style.display = "none";
}

function precipitationdepth() {

    map.spin(true);
    $('#precipitation-button').attr('disabled', 'true');
    sidebar.disablePanel('reachselect');

    var j = 0;
    preciplist = []
    var checkboxes = document.getElementsByName('precepcheck');
    for (var i = 0, n = checkboxes.length; i < n; i++) {
        if (checkboxes[i].checked) {
            preciplist.push(i)
        }
    };

    upper90 = document.getElementById("upper90check").checked

    errorcode1 = "e7x10"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.PrecipitationDepthURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("cb_list", JSON.stringify(preciplist))
    gpTask.setParam("upper90", upper90)

    gpTask.run(precipitationdepthCallback);

    function precipitationdepthCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.precipitationerror.e7x10 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#precipitation-button').removeAttr('disabled');
            map.spin(false);
            return
        }

        thecritavg = response.thecritavg

        var checkboxes = document.getElementsByName('stormcheck');
        for (var i = 0, n = preciplist.length; i < n; i++) {
            checkboxes[preciplist[i]].value = thecritavg[i]
            checkboxes[preciplist[i]].removeAttribute('disabled');
        };

        document.getElementById("tr20input").style.display = "block";
        $('#precipitation-button').removeAttr('disabled');
        document.getElementById("createwintr20-button").style.display = "block";
        document.getElementById("downloadwintr20error-button").style.display = "none";
        document.getElementById("downloadwintr20input-button").style.display = "none";
        document.getElementById("downloadwintr20output-button").style.display = "none";

        document.getElementById("tcsubarea").selectedIndex = 0;
        document.getElementById("userdavalue").value = userdachange[0];
        document.getElementById("usercnvalue").value = usercnchange[0];
        document.getElementById("usertcvalue").value = usertcchange[0];

        map.spin(false);
    }
}

function stormcheck() {
    var checkboxes = document.getElementsByName('stormcheck');
    for (var i = 0, n = preciplist.length; i < n; i++) {
        thecritavg[i] = checkboxes[preciplist[i]].value
    };
}

function dasubareachange(sub) {
    document.getElementById("userdavalue").value = userdachange[sub.target.value - 1]
}

function davaluechange(uservalue) {
    const subidtc = document.getElementById("tcsubarea").value - 1
    userdachange[subidtc] = Number(uservalue.target.value)
}

function cnsubareachange(sub) {
    document.getElementById("usercnvalue").value = usertcchange[sub.target.value - 1]
}

function cnvaluechange(uservalue) {
    const subidtc = document.getElementById("tcsubarea").value - 1
    usercnchange[subidtc] = Number(uservalue.target.value)
}

function tcsubareachange(sub) {
    document.getElementById("usertcvalue").value = usertcchange[sub.target.value - 1]
}

function tcvaluechange(uservalue) {
    const subidtc = document.getElementById("tcsubarea").value - 1
    usertcchange[subidtc] = Number(uservalue.target.value)
}

function restorevalues() {
    const subidtc = Number(document.getElementById("tcsubarea").value) - 1

    document.getElementById("userdavalue").value = userdachange_perm[subidtc]
    document.getElementById("usercnvalue").value = usercnchange_perm[subidtc]
    document.getElementById("usertcvalue").value = tt_[subidtc][tt_[subidtc].length - 1]
}

function tr20controlpanel() {
    map.spin(true);
    $('#createwintr20-button').attr('disabled', 'true');

    totalrating = totalrating.filter(Boolean);
    totalreach = totalreach.filter(Boolean);
    totaltype = totaltype.filter(Boolean);
    totalstage = totalstage.filter(Boolean);

    errorcode1 = "e8x10"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.TR20ControlURL,
        useCors: true,
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("main_increment", document.getElementById("dt_inc").value)
    gpTask.setParam("detail", document.getElementById("detailopt").checked)
    gpTask.setParam("arc", document.getElementById("arc").value)
    gpTask.setParam("arf", document.getElementById("arealreduction").checked)
    gpTask.setParam("delmarva", document.getElementById("peakrate").value)
    gpTask.setParam("cb_list", JSON.stringify(preciplist))
    gpTask.setParam("prec_user", JSON.stringify(thecritavg))
    gpTask.setParam("areami2", areami2)
    gpTask.setParam("ratingtype", JSON.stringify(totaltype))
    gpTask.setParam("minstage", JSON.stringify(totalstage))
    gpTask.setParam("reachno", JSON.stringify(totalreach))
    gpTask.setParam("rating", JSON.stringify(totalrating))
    gpTask.setParam("userda", JSON.stringify(userdachange))
    gpTask.setParam("usercn", JSON.stringify(usercnchange))
    gpTask.setParam("usertc", JSON.stringify(usertcchange))
    gpTask.setParam("upper90", document.getElementById("upper90check").checked)

    gpTask.run(tr20controlpanelCallback);

    function tr20controlpanelCallback(error, response, raw) {

        $('#createwintr20-button').removeAttr('disabled');

        if (error) {
            alertmodal("Error", "<b>" + errorcat.tr20error.e8x10 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            map.spin(false);
            return
        }

        inputstring = response.inputstring
        outputstring = response.outputstring
        errorstring = response.errorstring
        
        document.getElementById("wintr20resultstitle").style.display = "block";
        document.getElementById("downloadwintr20input-button").style.display = "block";
        document.getElementById("downloadwintr20output-button").style.display = "block";

        if (errorstring != 'NA') {
            alertmodal("WinTR-20", errorcat.tr20error.e8x11, "10vh")
            document.getElementById("downloadwintr20error-button").style.display = "block";
        } else {
            alertmodal("WinTR-20", errorcat.tr20error.e8x12, "10vh")
            document.getElementById("downloadwintr20error-button").style.display = "none";
        }

        map.spin(false);
    }
}

function recalculatetc() {

    var type_sheet = "";
    var elev_sheet = "";
    var slope_sheet = "";
    var avgarea_sheet = "";
    var width_sheet = "";
    var depth_sheet = "";
    var xarea_sheet = "";
    var tot_length_sheet = "";
    var vel_sheet = "";
    var i_time_sheet = "";

    var type_shallow = "";
    var elev_shallow = "";
    var slope_shallow = "";
    var avgarea_shallow = "";
    var width_shallow = "";
    var depth_shallow = "";
    var xarea_shallow = "";
    var tot_length_shallow = "";
    var vel_shallow = "";
    var i_time_shallow = "";

    var type_channel = "";
    var elev_channel = "";
    var slope_channel = "";
    var avgarea_channel = "";
    var width_channel = "";
    var depth_channel = "";
    var xarea_channel = "";
    var tot_length_channel = "";
    var vel_channel = "";
    var i_time_channel = "";

    tcmerged = true

    var subarea = document.getElementById("subtc").value - 1
    var sheetcheck = document.getElementById("singleoverland").checked
    var shallowcheck = document.getElementById("singleswale").checked
    var channelcheck = document.getElementById("singlechannel").checked

    const arrAvg = arr => arr.reduce((a, b) => a + b, 0) / arr.length
    const cumulativeSum = arr => arr.reduce((a, x, i) => [...a, x + (a[i - 1] || 0)], []);

    var occcounts_all = {}
    t_temp[subarea].forEach(function (x) { occcounts_all[x] = (occcounts_all[x] || 0) + 1; });

    function mergevalues() {
        var occcounts = {}
        t_temp[subarea].forEach(function (x) { occcounts[x] = (occcounts[x] || 0) + 1; });
        occcounts['overland'] = isNaN(occcounts['overland']) ? 0 : occcounts['overland'];
        occcounts['swale'] = isNaN(occcounts['swale']) ? 0 : occcounts['swale'];
        occcounts['channel'] = isNaN(occcounts['channel']) ? 0 : occcounts['channel'];

        type_sheet = t_temp[subarea].slice(0, occcounts['overland'])
        elev_sheet = e_temp[subarea].slice(0, occcounts['overland'])
        slope_sheet = s_temp[subarea].slice(0, occcounts['overland'])
        avgarea_sheet = a_temp[subarea].slice(0, occcounts['overland'])
        width_sheet = w_temp[subarea].slice(0, occcounts['overland'])
        depth_sheet = d_temp[subarea].slice(0, occcounts['overland'])
        xarea_sheet = x_temp[subarea].slice(0, occcounts['overland'])
        tot_length_sheet = tl_temp[subarea].slice(0, occcounts['overland'])
        vel_sheet = v_temp[subarea].slice(0, occcounts['overland'])
        i_time_sheet = it_temp[subarea].slice(0, occcounts['overland'])

        type_shallow = t_temp[subarea].slice(occcounts['overland'], occcounts['overland'] + occcounts['swale'])
        elev_shallow = e_temp[subarea].slice(occcounts['overland'], occcounts['overland'] + occcounts['swale'])
        slope_shallow = s_temp[subarea].slice(occcounts['overland'], occcounts['overland'] + occcounts['swale'])
        avgarea_shallow = a_temp[subarea].slice(occcounts['overland'], occcounts['overland'] + occcounts['swale'])
        width_shallow = w_temp[subarea].slice(occcounts['overland'], occcounts['overland'] + occcounts['swale'])
        depth_shallow = d_temp[subarea].slice(occcounts['overland'], occcounts['overland'] + occcounts['swale'])
        xarea_shallow = x_temp[subarea].slice(occcounts['overland'], occcounts['overland'] + occcounts['swale'])
        tot_length_shallow = tl_temp[subarea].slice(occcounts['overland'], occcounts['overland'] + occcounts['swale'])
        vel_shallow = v_temp[subarea].slice(occcounts['overland'], occcounts['overland'] + occcounts['swale'])
        i_time_shallow = it_temp[subarea].slice(occcounts['overland'], occcounts['overland'] + occcounts['swale'])

        type_channel = t_temp[subarea].slice(occcounts['overland'] + occcounts['swale'], occcounts['overland'] + occcounts['swale'] + occcounts['channel'])
        elev_channel = e_temp[subarea].slice(occcounts['overland'] + occcounts['swale'], occcounts['overland'] + occcounts['swale'] + occcounts['channel'])
        slope_channel = s_temp[subarea].slice(occcounts['overland'] + occcounts['swale'], occcounts['overland'] + occcounts['swale'] + occcounts['channel'])
        avgarea_channel = a_temp[subarea].slice(occcounts['overland'] + occcounts['swale'], occcounts['overland'] + occcounts['swale'] + occcounts['channel'])
        width_channel = w_temp[subarea].slice(occcounts['overland'] + occcounts['swale'], occcounts['overland'] + occcounts['swale'] + occcounts['channel'])
        depth_channel = d_temp[subarea].slice(occcounts['overland'] + occcounts['swale'], occcounts['overland'] + occcounts['swale'] + occcounts['channel'])
        xarea_channel = x_temp[subarea].slice(occcounts['overland'] + occcounts['swale'], occcounts['overland'] + occcounts['swale'] + occcounts['channel'])
        tot_length_channel = tl_temp[subarea].slice(occcounts['overland'] + occcounts['swale'], occcounts['overland'] + occcounts['swale'] + occcounts['channel'])
        vel_channel = v_temp[subarea].slice(occcounts['overland'] + occcounts['swale'], occcounts['overland'] + occcounts['swale'] + occcounts['channel'])
        i_time_channel = it_temp[subarea].slice(occcounts['overland'] + occcounts['swale'], occcounts['overland'] + occcounts['swale'] + occcounts['channel'])
    }

    function mergeoverland() {

        mergevalues()
        const typemerge = [type_sheet[type_sheet.length - 1]]
        const elevmerge = [parseFloat(arrAvg(elev_sheet.map(Number))).toFixed(1)]
        const slopemerge = [parseFloat(arrAvg(slope_sheet.map(Number))).toFixed(6)]
        const avgareamerge = [parseFloat(avgarea_sheet[avgarea_sheet.length - 1]).toFixed(6)]
        const widthmerge = [width_sheet[width_sheet.length - 1]]
        const depthmerge = [depth_sheet[depth_sheet.length - 1]]
        const xareamerge = [xarea_sheet[xarea_sheet.length - 1]]
        const tot_lengthmerge = [parseFloat(tot_length_sheet[tot_length_sheet.length - 1]).toFixed(1)]

        const sheetn = parseFloat(document.getElementById("sheet_manning").value)
        const sheetp = parseFloat(document.getElementById("sheet_precipitation").value)
        const sheetl = parseFloat(document.getElementById("sheet_length").value)

        const i_timemerge = [parseFloat(0.007 * Math.pow((sheetn * sheetl), 0.8) / Math.pow(sheetp, 0.5) / Math.pow(slopemerge[0], 0.4)).toFixed(4)]
        const velmerge = [parseFloat(tot_lengthmerge[0] / i_timemerge[0] / 3600).toFixed(3)]

        t_temp[subarea] = typemerge.concat(type_shallow).concat(type_channel)
        e_temp[subarea] = elevmerge.concat(elev_shallow).concat(elev_channel)
        s_temp[subarea] = slopemerge.concat(slope_shallow).concat(slope_channel)
        a_temp[subarea] = avgareamerge.concat(avgarea_shallow).concat(avgarea_channel)
        w_temp[subarea] = widthmerge.concat(width_shallow).concat(width_channel)
        d_temp[subarea] = depthmerge.concat(depth_shallow).concat(depth_channel)
        x_temp[subarea] = xareamerge.concat(xarea_shallow).concat(xarea_channel)
        tl_temp[subarea] = tot_lengthmerge.concat(tot_length_shallow).concat(tot_length_channel)
        v_temp[subarea] = velmerge.concat(vel_shallow).concat(vel_channel)
        it_temp[subarea] = i_timemerge.concat(i_time_shallow).concat(i_time_channel)
        tt_temp[subarea] = cumulativeSum(it_temp[subarea].map(Number))
        tt_temp[subarea] = tt_temp[subarea].map(arr => arr.toFixed(4))
    }

    function mergeswale() {

        mergevalues()
        const typemerge = [type_shallow[type_shallow.length - 1]]
        const elevmerge = [parseFloat(arrAvg(elev_shallow.map(Number))).toFixed(1)]
        const slopemerge = [parseFloat(arrAvg(slope_shallow.map(Number))).toFixed(6)]
        const avgareamerge = [parseFloat(avgarea_shallow[avgarea_shallow.length - 1]).toFixed(6)]
        const widthmerge = [width_shallow[width_shallow.length - 1]]
        const depthmerge = [depth_shallow[depth_shallow.length - 1]]
        const xareamerge = [xarea_shallow[xarea_shallow.length - 1]]
        const tot_lengthmerge = [parseFloat(tot_length_shallow[tot_length_shallow.length - 1]).toFixed(1) - parseFloat(tot_length_sheet[tot_length_sheet.length - 1]).toFixed(1)]

        var paved_const = 20.3282
        if (document.getElementById("unpavedopt").checked) { paved_const = 16.1345 }

        const velmerge = [parseFloat(paved_const * Math.pow(slopemerge[0], 0.5)).toFixed(3)]
        const i_timemerge = [parseFloat(tot_lengthmerge[0] / velmerge[0] / 3600).toFixed(4)]

        t_temp[subarea] = type_sheet.concat(typemerge).concat(type_channel)
        e_temp[subarea] = elev_sheet.concat(elevmerge).concat(elev_channel)
        s_temp[subarea] = slope_sheet.concat(slopemerge).concat(slope_channel)
        a_temp[subarea] = avgarea_sheet.concat(avgareamerge).concat(avgarea_channel)
        w_temp[subarea] = width_sheet.concat(widthmerge).concat(width_channel)
        d_temp[subarea] = depth_sheet.concat(depthmerge).concat(depth_channel)
        x_temp[subarea] = xarea_sheet.concat(xareamerge).concat(xarea_channel)
        tl_temp[subarea] = tot_length_sheet.concat(Number(tot_lengthmerge) + Number(tot_length_sheet)).concat(tot_length_channel)
        v_temp[subarea] = vel_sheet.concat(velmerge).concat(vel_channel)
        it_temp[subarea] = i_time_sheet.concat(i_timemerge).concat(i_time_channel)
        tt_temp[subarea] = cumulativeSum(it_temp[subarea].map(Number))
        tt_temp[subarea] = tt_temp[subarea].map(arr => arr.toFixed(4))
    }

    function mergechannel() {

        mergevalues()
        const typemerge = [type_channel[type_channel.length - 1]]
        const elevmerge = [parseFloat(arrAvg(elev_channel.map(Number))).toFixed(1)]
        const slopemerge = [parseFloat(arrAvg(slope_channel.map(Number))).toFixed(6)]
        const avgareamerge = [parseFloat(avgarea_channel[avgarea_channel.length - 1]).toFixed(6)]
        const widthmerge = [parseFloat(arrAvg(width_channel.map(Number))).toFixed(2)]
        const depthmerge = [parseFloat(arrAvg(depth_channel.map(Number))).toFixed(2)]
        const xareamerge = [parseFloat(arrAvg(xarea_channel.map(Number))).toFixed(2)]
        const tot_lengthmerge = [parseFloat(tot_length_channel[tot_length_channel.length - 1]).toFixed(1) - parseFloat(tot_length_shallow[tot_length_shallow.length - 1]).toFixed(1)]

        const channeln = parseFloat(document.getElementById("channel_manning").value)
        const hydrad = xareamerge[0] / (2 * Number(depthmerge[0]) + Number(widthmerge[0]))

        const velmerge = [parseFloat(1.49 * Math.pow(hydrad, 2 / 3) * Math.pow(slopemerge[0], 0.5) / channeln).toFixed(3)]
        const i_timemerge = [parseFloat(tot_lengthmerge[0] / velmerge[0] / 3600).toFixed(4)]

        t_temp[subarea] = type_sheet.concat(type_shallow).concat(typemerge)
        e_temp[subarea] = elev_sheet.concat(elev_shallow).concat(elevmerge)
        s_temp[subarea] = slope_sheet.concat(slope_shallow).concat(slopemerge)
        a_temp[subarea] = avgarea_sheet.concat(avgarea_shallow).concat(avgareamerge)
        w_temp[subarea] = width_sheet.concat(width_shallow).concat(widthmerge)
        d_temp[subarea] = depth_sheet.concat(depth_shallow).concat(depthmerge)
        x_temp[subarea] = xarea_sheet.concat(xarea_shallow).concat(xareamerge)
        tl_temp[subarea] = tot_length_sheet.concat(tot_length_shallow).concat(Number(tot_lengthmerge) + Number(tot_length_shallow))
        v_temp[subarea] = vel_sheet.concat(vel_shallow).concat(velmerge)
        it_temp[subarea] = i_time_sheet.concat(i_time_shallow).concat(i_timemerge)
        tt_temp[subarea] = cumulativeSum(it_temp[subarea].map(Number))
        tt_temp[subarea] = tt_temp[subarea].map(arr => arr.toFixed(4))
    }

    if (sheetcheck && shallowcheck == false && channelcheck == false) {
        if (occcounts_all['overland'] > 1) { mergeoverland() }
    }
    else if (sheetcheck == false && shallowcheck && channelcheck == false) {
        if (occcounts_all['swale'] > 1) { mergeswale() }
    }
    else if (sheetcheck == false && shallowcheck == false && channelcheck) {
        if (occcounts_all['channel'] > 1) { mergechannel() }
    }
    else if (sheetcheck && shallowcheck && channelcheck == false) {
        if (occcounts_all['overland'] > 1) { mergeoverland() }
        if (occcounts_all['swale'] > 1) { mergeswale() }
    }
    else if (sheetcheck && shallowcheck == false && channelcheck) {
        if (occcounts_all['overland'] > 1) { mergeoverland() }
        if (occcounts_all['channel'] > 1) { mergechannel() }
    }
    else if (sheetcheck == false && shallowcheck && channelcheck) {
        if (occcounts_all['swale'] > 1) { mergeswale() }
        if (occcounts_all['channel'] > 1) { mergechannel() }
    }
    else if (sheetcheck && shallowcheck && channelcheck) {
        if (occcounts_all['overland'] > 1) { mergeoverland() }
        if (occcounts_all['swale'] > 1) { mergeswale() }
        if (occcounts_all['channel'] > 1) { mergechannel() }
    }

    const p_temp = Array.from({ length: t_temp[subarea].length }, (_, i) => i + 1)

    changetcmodal(t_temp[subarea], tt_temp[subarea])
    createtctable(subarea, p_temp, t_temp[subarea], e_temp[subarea], s_temp[subarea], a_temp[subarea], w_temp[subarea], d_temp[subarea], x_temp[subarea], tl_temp[subarea], v_temp[subarea], it_temp[subarea], tt_temp[subarea])

    t_[subarea] = t_temp[subarea].slice(0);
    tt_[subarea] = tt_temp[subarea].slice(0);
    usertcchange[subarea] = tt_[subarea][tt_[subarea].length - 1]

}

function frre_calculator() {

    const frreegion = document.getElementById("frre_region").value;
    const frrearea = document.getElementById("frre_area").value;

    if (frreegion === 'A') {
        var parameter1 = document.getElementById("frre_landslope").value;
        var parameter2 = '00';
    } else if (frreegion === 'P') {
        var parameter1 = document.getElementById("frre_imp").value;
        var parameter2 = document.getElementById("frre_limestone").value;
    } else if (frreegion === 'B') {
        var parameter1 = document.getElementById("frre_imp").value;
        var parameter2 = document.getElementById("frre_limestone").value;
    } else if (frreegion === 'WC') {
        var parameter1 = document.getElementById("frre_imp").value;
        var parameter2 = document.getElementById("frre_asoil").value;
    } else if (frreegion === 'EC') {
        var parameter1 = document.getElementById("frre_landslope").value * 100;
        var parameter2 = document.getElementById("frre_asoil").value;
    }

    if (frrearea == '' || (parameter1 == '' && parameter2 == '')) {
        alert('Please fill out the missing data')
        return
    }

    map.spin(true);

    $('#frre_region').attr('disabled', 'true');
    $('#frre_area').attr('disabled', 'true');
    $('#frre_landslope').attr('disabled', 'true');
    $('#frre_limestone').attr('disabled', 'true');
    $('#frre_imp').attr('disabled', 'true');
    $('#frre_asoil').attr('disabled', 'true');
    $('#frre_adjust').attr('disabled', 'true');
    $('#frre_gage').attr('disabled', 'true');

    errorcode1 = "e3x20"
    var errorcode3 = frreegion
    errorcode3 += parseFloat(frrearea).toFixed(2).replace(".", "")
    errorcode3 += 'x'
    errorcode3 += parameter1
    errorcode3 += 'x'
    errorcode3 += parameter2

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.FRRECalculatorURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("region", frreegion);
    gpTask.setParam("area", parseFloat(frrearea).toFixed(2));
    gpTask.setParam("parameter1", parameter1);
    gpTask.setParam("parameter2", parameter2);
    gpTask.setParam("version", document.getElementById("frreversion2").value);

    if (document.getElementById("frre_adjust").checked) {
        gpTask.setParam("gageid", document.getElementById("frre_gage").value);
    } else {
        gpTask.setParam("gageid", '');
    }

    gpTask.run(frre_calculatorCallback);

    function frre_calculatorCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.frreerror.e3x20 + "</b>" + errormsg(errorcode1 + errorcode3), "20vh")
            map.spin(false);
            $('#frre_region').removeAttr('disabled');
            $('#frre_area').removeAttr('disabled');
            $('#frre_landslope').removeAttr('disabled');
            $('#frre_limestone').removeAttr('disabled');
            $('#frre_imp').removeAttr('disabled');
            $('#frre_asoil').removeAttr('disabled');
            $('#frre_adjust').removeAttr('disabled');
            $('#frre_gage').removeAttr('disabled');
            return
        }

        const estim_par = response.estim_par;
        const warning_message2 = response.warning_message;
        const cl = response.cl;
        const cu = response.cu;
        const yhat = response.yhat;
        const sepc = response.sepc;
        const eqyrs = response.eqyrs;
        const sepred = response.sepred;

        const it_frre = ['1.25', '1.50', '2', '5', '10', '25', '50', '100', '200', '500'];

        var frre1_html = '<table border="0" align="center">' +
            '<col width="100">' +
            '<col width="100">'
        for (var i = 0; i < it_frre.length; i++) {
            frre1_html += '<tr>' +
                '<td align="left">Q(' + it_frre[i] + '):</td>' +
                '<td align="right">' + yhat[i] + ' cfs</td>' +
                '</tr>';
        }
        frre1_html += '</table><p></p>';

        var frre3_html = '<table border="0" align="center">' +
            '<col width="150">' +
            '<col width="300">'
        for (var i = 0; i < estim_par[0].length; i++) {
            frre3_html += '<tr>' +
                '<td align="left">' + estim_par[0][i] + ':</td>' +
                '<td align="right">' + estim_par[1][i] + '</td>' +
                '</tr>';
        }
        frre3_html += '</table><p></p>';

        var frre4_html = '<table border="0" align="center">' +
            '<col width="70">' +
            '<col width="100">' +
            '<col width="150">' +
            '<col width="150">' +
            '<col width="150">' +
            '<tr align="center"><th>Return Period</th>' +
            '<th>Peak Flow Rate</th>' +
            '<th>Standard Error of Prediction</th>' +
            '<th>Equivalent Years of Record</th>' +
            '<th>Standard Error of Prediction</th></tr>' +
            '<tr align="center"><th></th>' +
            '<th>[cfs]</th>' +
            '<th>[percent]</th>' +
            '<th></th>' +
            '<th>[logs]</th></tr>';
        for (var i = 0; i < it_frre.length; i++) {
            frre4_html += '<tr>';
            '<td align="center">' + it_frre[i] + '</td>' +
                '<td align="center">' + yhat[i] + '</td>' +
                '<td align="center">' + sepc[i] + '</td>' +
                '<td align="center">' + eqyrs[i] + '</td>' +
                '<td align="center">' + sepred[i] + '</td>' +
                '</tr>';
        }
        frre4_html += '</table><p></p>';

        var frre5_html = '<table border="0" align="center">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<col width="70">' +
            '<tr align="center"><th>Return Period</th>' +
            '<th style="text-align:right;">50</th><th style="text-align:left;">%</th>' +
            '<th style="text-align:right;">67</th><th style="text-align:left;">%</th>' +
            '<th style="text-align:right;">90</th><th style="text-align:left;">%</th>' +
            '<th style="text-align:right;">95</th><th style="text-align:left;">%</th></tr>' +
            '<tr align="center"><th></th>' +
            '<th>lower</th><th>upper</th>' +
            '<th>lower</th><th>upper</th>' +
            '<th>lower</th><th>upper</th>' +
            '<th>lower</th><th>upper</th></tr>';
        for (var i = 0; i < it_frre.length; i++) {
            frre5_html += '<tr>' +
                '<td align="center">' + it_frre[i] + '</td>' +
                '<td align="center">' + cl[i][0] + '</td>' +
                '<td align="center">' + cu[i][0] + '</td>' +
                '<td align="center">' + cl[i][1] + '</td>' +
                '<td align="center">' + cu[i][1] + '</td>' +
                '<td align="center">' + cl[i][2] + '</td>' +
                '<td align="center">' + cu[i][2] + '</td>' +
                '<td align="center">' + cl[i][3] + '</td>' +
                '<td align="center">' + cu[i][3] + '</td>' +
                '</tr>';
        }
        frre5_html += '</table><p></p>';

        var frrecalc_modal = '<div class="modal-dialog modal-lg" style="width:100%;">' +
            '<div class="modal-content">' +
            '<div class="modal-header">' +
            '<h4 class="modal-title">FRRE Discharge</h4>' +
            '</div>' +
            '<div class="modal-body">' +
            '<table border="0">' +
            '<col width="300">' +
            '<col width="300">' +
            '<tr><td align="left">GISHydroWEB Release Version:</td><td align="left">' + webversion + '</td></tr>' +
            '<tr><td align="left">Analysis Date:</td><td align="left">' + today + '</td></tr>' +
            '</table><p></p>' +
            '<p align="center" style="font-size:16px;"><b>' + document.getElementById("frreversion2").value + ' Maryland Fixed Region Equations</b></p>' +
            '<p align="center"><b>Peak Flow (Total Area Weighted)</b></p>' +
            frre1_html +
            '<p align="center"><b>Parameters</b></p>' +
            frre3_html +
            '<p align="center"><b>Flood Frequency Estimates</b></p>' +
            frre4_html +
            '<p align="center"><b>Prediction Intervals</b></p>' +
            frre5_html +
            '<p align="center" style="color:#B21E28;">';
        for (var i = 0; i < warning_message2.length; i++) {
            frrecalc_modal += '<b>' + warning_message2[i] + '</b><br/>';
        }
        frrecalc_modal += '</p>' +
            '</div>' +
            '<div class="modal-footer" style="justify-content: space-between;">' +
            '<button type="button" class="btn btn-default" onclick=modaltocsv(frrecalc_mod,"FRRE.csv")>Download CSV</button>' +
            '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
            '</div>' +
            '</div>' +
            '</div>';

        $('#frre_region').removeAttr('disabled');
        $('#frre_area').removeAttr('disabled');
        $('#frre_landslope').removeAttr('disabled');
        $('#frre_limestone').removeAttr('disabled');
        $('#frre_imp').removeAttr('disabled');
        $('#frre_asoil').removeAttr('disabled');
        $('#frre_adjust').removeAttr('disabled');
        $('#frre_gage').removeAttr('disabled');

        map.spin(false);
        $("#frrecalc_mod").html(frrecalc_modal);
        $("#frrecalc_mod").modal()
    }
};

function contours() {
    map.spin(true);
    contourlines.clearLayers();
    LC.removeLayer(contourlines);
    $('#contours-button').attr('disabled', 'true');

    errorcode1 = "e9x10"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.LoadLayerURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("inputlayer", "Contours")
    gpTask.setParam("contourinterval", document.getElementById("contourint").value)
    gpTask.setParam("basecontour", document.getElementById("contourbase").value)

    gpTask.run(contourCallback);

    function contourCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.layererror.e9x10 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#contours-button').removeAttr('disabled');
            map.spin(false);
            return
        }
        contourslayer = response.outputlayer
        contourlines.addLayer(L.geoJson(contourslayer, {
            color: '#606060',
            weight: 0.5,
        }));
        LC.addOverlay(contourlines, "Contours " + document.getElementById("contourint").value + "ft");
        $('#contours-button').removeAttr('disabled');
        document.getElementById("contours-button").style.display = "block";
        $('#contours_dwnl').removeAttr('disabled');
        map.spin(false);
    }
}

function landuseload() {
    map.spin(true);
    $('#landuse-button').attr('disabled', 'true');

    $.ajax({
        'async': false,
        'global': false,
        'url': "json/landuse-style.json",
        'dataType': "json",
        'success': function (jsondata) {
            lustyle = jsondata;
        }
    });

    errorcode1 = "e9x20"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.LoadLayerURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("inputlayer", "Land Use")

    gpTask.run(landuseloadCallback);

    function landuseloadCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.layererror.e9x20 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#landuse-button').removeAttr('disabled');
            map.spin(false);
            return
        }

        landuse_layer = response.outputlayer
        lugeojson = L.geoJson(landuse_layer, {
            style: style,
            onEachFeature: onEachFeaturelu
        });
        landuselyr.addLayer(lugeojson);
        LC.addOverlay(landuselyr, basin_lu);

        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info');
            this.update();
            return this._div;
        };

        info.update = function (props) {
            this._div.innerHTML = '<h4>Land Use Class:</h4>' + (props ?
                '<b>' + props.CLASS_NAME + '</b><br />'
                : 'Hover over a land use');
        };

        info.addTo(map);
        $("#landuse-button").html('Land Use on Map');
        map.spin(false);
    }
};

function soilsload() {
    map.spin(true);
    $('#soils-button').attr('disabled', 'true');

    errorcode1 = "e9x30"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.LoadLayerURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("inputlayer", "Soils")

    gpTask.run(soilsloadCallback);

    function soilsloadCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.layererror.e9x30 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            map.spin(false);
            $('#soils-button').removeAttr('disabled');
            return
        }

        soils_layer = response.outputlayer
        soilsgeojson = L.geoJson(soils_layer, {
            style: style2,
            onEachFeature: onEachFeaturesoils
        });
        soilslyr.addLayer(soilsgeojson);
        LC.addOverlay(soilslyr, basin_soil);

        info2.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info');
            this.update();
            return this._div;
        };

        var soiltypeletter = ["A", "B", "C", "D"]
        soiltypeletter[-2] = "N/A"
        info2.update = function (props) {
            this._div.innerHTML = '<h4>Hydrologic Soil Group:</h4>' + (props ?
                '<b>Soil Type: ' + soiltypeletter[parseInt(props.gridcode) - 1] + '</b><br />'
                : 'Hover over a soil class');
        };

        info2.addTo(map);
        $("#soils-button").html('Soils on Map');
        map.spin(false);
    }
};

function curvenumberload() {
    map.spin(true);
    $('#curvenumber-button').attr('disabled', 'true');

    errorcode1 = "e9x40"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.LoadLayerURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("inputlayer", "Curve Number")

    gpTask.run(curvenumberCallback);

    function curvenumberCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.layererror.e9x40 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            map.spin(false);
            $('#curvenumber-button').removeAttr('disabled');
            return
        }

        curvenumber_layer = response.outputlayer
        curvenumbergeojson = L.geoJson(curvenumber_layer, {
            style: style3,
            onEachFeature: onEachFeaturecurvenumber
        });
        curvenumberlyr.addLayer(curvenumbergeojson);
        LC.addOverlay(curvenumberlyr, "Curve Number");

        info3.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info');
            this.update();
            return this._div;
        };

        info3.update = function (props) {
            this._div.innerHTML = (props ?
                '<b>Curve Number: ' + parseInt(props.gridcode) + '</b><br />'
                : 'Hover over a land use');
        };

        info3.addTo(map);
        $("#curvenumber-button").html('Curve Number on Map');
        map.spin(false);
    };
};

function longestpathload() {
    map.spin(true);
    $('#longestpath-button').attr('disabled', 'true');

    errorcode1 = "e9x50"

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.LoadLayerURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("inputlayer", "Longest Path")
    gpTask.setParam("reaches", reaches)

    gpTask.run(longpathCallback);

    function longpathCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.layererror.e9x50 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            map.spin(false);
            $('#longestpath-button').removeAttr('disabled');
            return
        }

        longestpath_layer = response.outputlayer
        longestpathlyr.addLayer(L.geoJson(longestpath_layer, {
            color: '#E74C3C',
            weight: 3,
        }));

        LC.addOverlay(longestpathlyr, "Longest Paths");
        $("#longestpath-button").html('Longest Paths on Map');
        map.spin(false);
    };
};

function layerdownload() {

    map.spin(true);
    $('#layerdownload-button').attr('disabled', 'true');
    errorcode1 = "e9x60"

    const layerlistid = [
        "wshed_dwnl",
        "streams_dwnl",
        "subshed_dwnl",
        "lfp_dwnl",
        "contours_dwnl",
        "dem_dwnl",
        "flowdir_dwnl",
        "flowacc_dwnl",
        "landuse_dwnl",
        "soils_dwnl",
        "cn_dwnl",
        "slope_dwnl"
    ]

    var downloadlist = []
    for (var i = 0; i < layerlistid.length; i++) {
        if (document.getElementById(layerlistid[i]).checked) {
            downloadlist.push(layerlistid[i])
        }
    }

    var gpService = L.esri.GP.service({
        url: siteconfig.appServer.serverURL + siteconfig.appConfig.DownloadLayerURL,
        useCors: false
    });
    var gpTask = gpService.createTask();

    gpTask.setParam("projectname", full_project_name)
    gpTask.setParam("layerlist", JSON.stringify(downloadlist))

    gpTask.run(ldownloadlayerCallback);

    function ldownloadlayerCallback(error, response, raw) {

        if (error) {
            alertmodal("Error", "<b>" + errorcat.layererror.e9x60 + "</b>" + errormsg(errorcode1 + errorcode2), "20vh")
            $('#layerdownload-button').removeAttr('disabled');
            map.spin(false);
            return
        }

        zip_url = response.outputfile

        var downloadLink = document.createElement('a');

        downloadLink.href = zip_url.url;
        downloadLink.setAttribute('download', '');
        downloadLink.target = 'downloadIframe';
        downloadLink.click();


        $('#layerdownload-button').removeAttr('disabled');
        map.spin(false);
    };
}

function stylefeature(feature) {
    return {
        crossOrigin: null,
        fillColor: '#FA6FFA',
        fillOpacity: 0.5,
        color: 'black',
        weight: 2,
    };
}

function forEachFeature(feature, layer) {

    var popupContent = "<p><b>ID: </b>" + feature.properties.ARCID + '</p>';

    layer.bindPopup(popupContent);

    layer.on("click", function (e) {
        subshed2_layer.setStyle(stylefeature);
        layer.setStyle(highlightfeature);
    });
}

function downloadFile(textarg, filename, typeformat) {
    var auxFile;
    var downloadLink;

    auxFile = new Blob([textarg], { type: typeformat });
    downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(auxFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
}

function modaltocsv(element, filename) {
    var csv = [];
    var rows = element.querySelectorAll("h4, p, table tr");

    for (var i = 0; i < rows.length; i++) {

        var row = [], cols = rows[i].querySelectorAll("td, th");

        if (cols[0] === undefined) {
            row.push(rows[i].innerText)
        }
        else {
            for (var j = 0; j < cols.length; j++)
                row.push(cols[j].innerText);
        }
        csv.push(row.join(","));
    }

    downloadFile(csv.join("\n"), filename, "text/csv");
}

function uploadFile() {

    input = document.getElementById('customFile');
    if (!input.files[0]) {
        alert("Please select a file before clicking 'Upload'");
    } else {
        file = input.files[0];
        fr = new FileReader();
        fr.onload = receiveBinary;
        fr.readAsArrayBuffer(file);
    }

    function receiveBinary() {

        if (uploadshp_flag) {
            clearuploadFile()
        }
        result = fr.result
        zipresult = result
        uploadshp = new L.Shapefile(result);
        uploadshp.addTo(map);
        uploadshp_flag = true
        $('#clearupload-button').removeAttr('disabled');
        //$('#wshed_upl').removeAttr('disabled');
    }
}

function clearuploadFile() {
    $('#clearupload-button').attr('disabled', 'true');
    if(document.getElementById('wshed_upl').checked){
        //document.getElementById('wshed_upl').click();
    };
    //$('#wshed_upl').attr('disabled', 'true');
    uploadshp.removeFrom(map)
    uploadshp_flag = false
}