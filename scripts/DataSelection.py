# -*- coding: utf-8 -*-
"""
Modified 08/2021

@author: Javier.Mardones
"""

from arcpy import (env,
                   CopyFeatures_management,
                   PolygonToRaster_conversion,
                   GeneratePointsAlongLines_management,
                   RasterToPolygon_conversion,
                   SpatialReference,
                   CreateFeatureclass_management,
                   Intersect_analysis,
                   JoinField_management,
                   BuildRasterAttributeTable_management,
                   management,
                   RasterToPoint_conversion,
                   Raster,
                   Dissolve_management,
                   Clip_analysis,
                   GetParameterAsText,
                   Point,
                   Project_management,
                   Delete_management,
                   PointGeometry,
                   Clip_management,
                   SearchCursor,
                   AddField_management,
                   SetParameterAsText
                   )
from arcpy.sa import (ExtractMultiValuesToPoints,
                      IsNull,
                      Int,
                      Plus,
                      Divide,
                      Times,
                      Watershed,
                      SnapPourPoint,
                      Expand,
                      Combine,
                      Lookup,
                      GreaterThanEqual,
                      Extent,
                      Con)
from arcpy.da import UpdateCursor as UpdateCursorda
from arcpy.da import SearchCursor as SearchCursorda
import json
import os
import time
#import zipfile

set_i = 0
proj_name = GetParameterAsText(set_i).replace(" ", "_"); set_i = set_i + 1
spatialref = GetParameterAsText(set_i); set_i = set_i + 1
mouse_lon_proj = float(GetParameterAsText(set_i)); set_i = set_i + 1
mouse_lat_proj = float(GetParameterAsText(set_i)); set_i = set_i + 1
dem_layer = GetParameterAsText(set_i); set_i = set_i + 1
soil_layer = GetParameterAsText(set_i); set_i = set_i + 1
land_layer = GetParameterAsText(set_i); set_i = set_i + 1
hyd_cond = GetParameterAsText(set_i); set_i = set_i + 1
acc_thr = float(GetParameterAsText(set_i)); set_i = set_i + 1
userstream = GetParameterAsText(set_i) == "true"; set_i = set_i + 1
folder_name = GetParameterAsText(set_i); set_i = set_i + 1
uploadedlayer = GetParameterAsText(set_i) == "true"; set_i = set_i + 1
#inshp = GetParameterAsText(set_i); set_i = set_i + 1

#get path from environment variable
directory = r"" + str(os.environ['GISHydro_DIR'])
directorygdb = os.path.join(directory, "data","gishydro.gdb")
demgdb = os.path.join(directory, "data","dem.gdb")
landusegdb = os.path.join(directory, "data","landuse.gdb")
soilsgdb = os.path.join(directory, "data","soils.gdb")

sr_map = SpatialReference(4326)
sr_md = SpatialReference(26985)

dem = os.path.join(demgdb, dem_layer)
landuse = os.path.join(landusegdb, land_layer)
soils = os.path.join(soilsgdb, soil_layer)

def coord_transf(x1,y1,sr1,sr2):
    pt1 = Point(x1,y1)
    ptgeo1 = PointGeometry(pt1, sr1)
    ptgeo2 = ptgeo1.projectAs(sr2)
    pt2 = ptgeo2.lastPoint
    x2 = float(pt2.X)
    y2 = float(pt2.Y)
    return x2, y2

temp_folder = os.path.join(directory, "projects")
if not os.path.exists(temp_folder):
    os.mkdir(temp_folder, 0o755)

if userstream:
    optfolder = os.path.join(temp_folder, folder_name)
else:
    folder_name = time.strftime("%Y%m%d_%H%M%S") + "_" + proj_name
    optfolder = os.path.join(temp_folder, folder_name)
    os.mkdir(optfolder)

env.overwriteOutput = True
env.scratchWorkspace = optfolder
env.workspace = optfolder
env.snapRaster = dem

rast = Raster(dem)
cellsize = rast.meanCellWidth

if userstream:
    dem = os.path.join(optfolder, "dem_ext.tif")
    flowacc = os.path.join(optfolder, "flowacc_ext.tif")
    flowdir = os.path.join(optfolder, "flowdir_ext.tif")
    infstr = os.path.join(optfolder, "infstr_ext.tif")

else:
    flowacc = os.path.join(directory, "data", "hydro30.gdb", "flowacc30")
    flowdir = os.path.join(directory, "data", "hydro30.gdb", "flowdir30")
    infstr = os.path.join(directory, "data", "hydro30.gdb", "infstreams30")
    if int(cellsize) == 10:
        flowacc = os.path.join(directory, "data", "hydro10.gdb", "flowacc10")
        flowdir = os.path.join(directory, "data", "hydro10.gdb", "flowdir10")
        infstr = os.path.join(directory, "data", "hydro10.gdb", "infstreams10")

"""
if uploadedlayer:
              
    with zipfile.ZipFile(inshp,"r") as zip_ref:
        zip_ref.extractall(optfolder)
        extracted = zip_ref.namelist()
        extracted_file = os.path.join(optfolder, os.path.splitext(extracted[0])[0])
    
    out_features = os.path.join(optfolder, "uploaded_layer_proj.shp")
    CopyFeatures_management(os.path.join(optfolder, extracted_file + ".shp"), out_features)
    
    Project_management(out_features, os.path.join(optfolder, "uploaded_layer.shp"), sr_md)    

    CopyFeatures_management(os.path.join(optfolder, "uploaded_layer.shp"), os.path.join(optfolder, "wshed.shp"))
    PolygonToRaster_conversion(os.path.join(optfolder, "wshed.shp"), "FID", os.path.join(optfolder, "basingrid_aux.tif"), "", "", cellsize)
    GeneratePointsAlongLines_management(os.path.join(optfolder, "wshed.shp"), os.path.join(optfolder, "usr_pour_point.shp"), "DISTANCE", cellsize)
    ExtractMultiValuesToPoints(os.path.join(optfolder, "usr_pour_point.shp"), [[dem, "Elev"]])
    
    rastertemp = Raster(os.path.join(optfolder, "basingrid_aux.tif"))
    rastertemp = Plus(rastertemp, 1)
    rastertemp = Divide(rastertemp, rastertemp)
    rastertemp.save(os.path.join(optfolder, "basingrid.tif"))
    
    minelev = 1e10
    with SearchCursorda(os.path.join(optfolder, "usr_pour_point.shp"), "Elev") as cursor:
        for row in cursor:
            elev_1e6 = int(float(row[0])*1e6)
            if  elev_1e6 < minelev:
                minelev = elev_1e6
    
    with UpdateCursorda(os.path.join(optfolder, "usr_pour_point.shp"), "Elev") as cursor:
        for row in cursor:
            elev_1e6 = int(float(row[0])*1e6)
            if not elev_1e6 == minelev:
                cursor.deleteRow()
         

    Clip_management(flowacc,"",os.path.join(optfolder, "flowacc.tif"), os.path.join(optfolder, "wshed.shp"), "", "ClippingGeometry","MAINTAIN_EXTENT")
    outSnapPour = SnapPourPoint(os.path.join(optfolder, "usr_pour_point.shp"), os.path.join(optfolder, "flowacc.tif"), cellsize*10)
    pour_point = RasterToPoint_conversion(outSnapPour, os.path.join(optfolder, "usr_pour_point.shp"))

else:
"""

if spatialref == "4326":
    x, y = coord_transf(mouse_lon_proj, mouse_lat_proj, sr_map, sr_md)
elif spatialref == "26985":
    x = float(mouse_lon_proj)
    y = float(mouse_lat_proj)
point = PointGeometry(Point(x, y))

env.extent = Extent(x-cellsize, y-cellsize, x+cellsize, y+cellsize)
outSnapPour = SnapPourPoint(point, infstr, 0)
pour_point = RasterToPoint_conversion(outSnapPour, os.path.join(optfolder, "usr_pour_point.shp"))
outSnapPour.save(os.path.join(optfolder, "pour_point.tif"))
for row in SearchCursorda(pour_point, ["SHAPE@XY"]):
    x, y = row[0]
outletxy = management.GetCellValue(infstr, "{} {}".format(x, y))

env.extent = Raster(dem)
wshed = Watershed(flowdir, os.path.join(optfolder, "pour_point.tif"))
watershed = Con(wshed >= 0, 1, IsNull(wshed))
RasterToPolygon_conversion(watershed, os.path.join(optfolder, "wshed_aux.shp"),"NO_SIMPLIFY","VALUE")
Dissolve_management(os.path.join(optfolder, "wshed_aux.shp"), os.path.join(optfolder, "wshed.shp"), "gridcode")
Clip_management(watershed,"",os.path.join(optfolder, "basingrid.tif"), os.path.join(optfolder, "wshed_aux.shp"), "#", "ClippingGeometry","MAINTAIN_EXTENT")
    
Project_management(os.path.join(optfolder, "wshed.shp"), os.path.join(optfolder, "wshed_proj.shp"), sr_map)
BuildRasterAttributeTable_management(os.path.join(optfolder, "basingrid.tif"), "Overwrite")

if not userstream:
    Clip_analysis(os.path.join(directorygdb, "nhd_streams_mr"), os.path.join(optfolder, "wshed.shp"), os.path.join(optfolder, "nhd_strs.shp"))

# *******************************************************************************************************
# gage checking and selection
# *******************************************************************************************************

usgsgages = os.path.join(directorygdb, "usgsgagesm")
mdgages = os.path.join(directorygdb, "mdgagedstreams2022")
outletpoint = os.path.join(optfolder, "usr_pour_point.shp")

# added on 10-13-2017: Only using intersect tool to identify gauges which overlap watershed and mdgagugedstreams2016 file MODIFIED 5/2020
Intersect_analysis([mdgages,os.path.join(optfolder, "wshed.shp")], os.path.join(optfolder, "mask_ints.shp"),"ALL","#","INPUT")
JoinField_management(os.path.join(optfolder, "mask_ints.shp"),"GAGE_ID",usgsgages,"GAGE_ID","GAGE_ID")
Intersect_analysis([os.path.join(optfolder, "mask_ints.shp"),outletpoint], os.path.join(optfolder, "gauge_outlet.shp"),"ALL","#","INPUT")

gagelist = []
gagevalue = SearchCursor(os.path.join(optfolder, "gauge_outlet.shp"),"","","GAGE_ID","")
for g in gagevalue:
    gid = g.getValue("GAGE_ID")
    gagelist.append(gid)

# Creates layers for delineating subwatersheds in the future
CreateFeatureclass_management(optfolder, "addasstreams.shp", "POLYLINE", "", "ENABLED", "DISABLED", sr_md)
CreateFeatureclass_management(optfolder, "addasoutlets.shp", "POINT", "", "ENABLED", "DISABLED", sr_md)
CreateFeatureclass_management(optfolder, "addasreservoir.shp", "POINT", "", "ENABLED", "DISABLED", sr_md)

### DATA MANAGEMENT

basingrid = Raster(os.path.join(optfolder, "basingrid.tif"))
extentdist = cellsize*5
env.extent = Extent(basingrid.extent.XMin-extentdist, basingrid.extent.YMin-extentdist, basingrid.extent.XMax+extentdist, basingrid.extent.YMax+extentdist)

basinexpand = Expand(basingrid, 5, [1])

env.snapRaster = dem

lu_clip = Times(landuse, basingrid)
lu_clip.save(os.path.join(optfolder, "landuse.tif"))

accum = Times(flowacc, basinexpand)
accum.save(os.path.join(optfolder, "flowacc.tif"))

## AOI extent check for land use

lutab = SearchCursor(os.path.join(optfolder, "landuse.tif"), "", "", "Count", "")
    
lucount = 0
for row in lutab:
    lucount = row.getValue("Count") + lucount

shedtab = SearchCursor(basingrid, "", "", "Count", "")
for row in shedtab:
    basinarea = row.getValue("Count")

ludataperc = lucount/basinarea * 100

## Check for near border watershed location

extentlyr = Clip_analysis(os.path.join(optfolder, "wshed.shp"), os.path.join(directorygdb, "boundarycheck"))
dummy_cursor = SearchCursor(extentlyr, "", "", "FID", "")
checkext = dummy_cursor.next()
extentcheck = False
if checkext != None:
    extentcheck = True

## project data for leaflet

areami2 = float((basinarea * pow(cellsize, 2)) / 2588881)  # conversion into sq miles
if acc_thr/640 > areami2:
    acc_thr = areami2*9/10

srcpixel = acc_thr/ pow(cellsize, 2) /0.000247
infstr_ = Con(accum >= int(srcpixel), accum)
infstr_ = Int(infstr)
infstr_.save(os.path.join(optfolder, "infstreams.tif"))

streams = GreaterThanEqual(os.path.join(optfolder, "infstreams.tif"), 1)
RasterToPolygon_conversion(streams, os.path.join(optfolder, "infstr_aux.shp"),"NO_SIMPLIFY","VALUE")
Dissolve_management(os.path.join(optfolder, "infstr_aux.shp"), os.path.join(optfolder, "infstr.shp"), "gridcode")
Project_management(os.path.join(optfolder, "infstr.shp"), os.path.join(optfolder, "infstr_proj.shp"), sr_map)

if ludataperc < 0.1:
    try:
        Delete_management(os.path.join(optfolder, "basingrid_aux.tif"))
        Delete_management(os.path.join(optfolder, "infstr.shp"))
        Delete_management(os.path.join(optfolder, "wshed_aux.shp"))
        Delete_management(os.path.join(optfolder, "infstr_aux.shp"))
        Delete_management(os.path.join(optfolder, "mask_ints.shp"))
    except:
        pass

else:

    management.JoinField(os.path.join(optfolder, "landuse.tif"),"Value",landuse,"VALUE","CLASS_NAME")

    dem_clip = Times(dem, basinexpand)
    dem_clip.save(os.path.join(optfolder, "dem_clip.tif"))

    fdir = Times(flowdir, basinexpand)
    fdir.save(os.path.join(optfolder, "flowdir.tif"))

    soils_clip = Times(soils, basingrid)
    soils_clip.save(os.path.join(optfolder, "soils.tif"))


    ## CURVE NUMBER RASTER

    if land_layer == "nlcd2019" or land_layer == "nlcd2011" or land_layer == "nlcd2006" or land_layer == "nlcd2016" or land_layer == "nlcd2001":
        if hyd_cond == "Fair":
            lut_file = os.path.join(directory, "data","lookup","nlcdlookupfair.txt")
        elif hyd_cond == "Good":
            lut_file = os.path.join(directory, "data","lookup","nlcdlookupgood.txt")
        elif hyd_cond == "Poor":
            lut_file = os.path.join(directory, "data","lookup","nlcdlookuppoor.txt")

    if land_layer == "lu97m" or land_layer == "mdplu2002" or land_layer == "mdp2010":
        if hyd_cond == "Fair":
            lut_file = os.path.join(directory, "data","lookup","andlookupfair.txt")
        elif hyd_cond == "Good":
            lut_file = os.path.join(directory, "data","lookup","andlookupgood.txt")
        elif hyd_cond == "Poor":
            lut_file = os.path.join(directory, "data","lookup","andlookuppoor.txt")

    if land_layer == "mdde2002":
        if hyd_cond == "Fair":
            lut_file = os.path.join(directory, "data","lookup","mddelookupfair.txt")
        elif hyd_cond == "Good":
            lut_file = os.path.join(directory, "data","lookup","mddelookupgood.txt")
        elif hyd_cond == "Poor":
            lut_file = os.path.join(directory, "data","lookup","mddelookuppoor.txt")

    if land_layer == "luult":
        if hyd_cond == "Fair":
            lut_file = os.path.join(directory, "data","lookup","zoninglookupfair.txt")
        elif hyd_cond == "Good":
            lut_file = os.path.join(directory, "data","lookup","zoninglookupgood.txt")
        elif hyd_cond == "Poor":
            lut_file = os.path.join(directory, "data","lookup","zoninglookuppoor.txt")

    if land_layer == "mrlc":
        if hyd_cond == "Fair":
            lut_file = os.path.join(directory, "data","lookup","mrlclookupfair.txt")
        elif hyd_cond == "Good":
            lut_file = os.path.join(directory, "data","lookup","mrlclookupgood.txt")
        elif hyd_cond == "Poor":
            lut_file = os.path.join(directory, "data","lookup","mrlclookuppoor.txt")

    if land_layer == "lu70":
        if hyd_cond == "Fair":
            lut_file = os.path.join(directory, "data","lookup","usgslookupfair.txt")
        elif hyd_cond == "Good":
            lut_file = os.path.join(directory, "data","lookup","usgslookupgood.txt")
        elif hyd_cond == "Poor":
            lut_file = os.path.join(directory, "data","lookup","usgslookuppoor.txt")

    lut_row = []
    with open(lut_file, "r") as f:
        next(f)
        for line in f:
            lut_row.append(line.split("\t"))
    lu_codes = [item[0] for item in lut_row]

    mergerasts = Combine([os.path.join(optfolder, "landuse.tif"),os.path.join(optfolder, "soils.tif")])
    mergerasts.save(os.path.join(optfolder,"cn_aux.tif"))

    AddField_management(os.path.join(optfolder,"cn_aux.tif"), "cn", "LONG")
    with UpdateCursorda(os.path.join(optfolder,"cn_aux.tif"),["landuse","soils","cn"]) as rows:
        for row in rows:
            if row[1] == -1:
                cnvalue = 100
            else:
                soilopts = lut_row[lu_codes.index(str(row[0]))][2:6]
                cnvalue = soilopts[int(row[1])-1]
            row[2] = str(cnvalue)
            rows.updateRow(row)
    del rows

    outRaster = Lookup(os.path.join(optfolder,"cn_aux.tif"),"cn")
    outRaster.save(os.path.join(optfolder, "curvenumber.tif"))

    try:
        Delete_management(os.path.join(optfolder, "cn_aux.tif"))
        Delete_management(os.path.join(optfolder, "infstr.shp"))
        Delete_management(os.path.join(optfolder, "wshed_aux.shp"))
        Delete_management(os.path.join(optfolder, "infstr_aux.shp"))
        Delete_management(os.path.join(optfolder, "mask_ints.shp"))
    except:
        pass

SetParameterAsText(set_i, json.dumps(gagelist)); set_i = set_i + 1
SetParameterAsText(set_i, os.path.join(optfolder, "wshed_proj.shp")); set_i = set_i + 1
SetParameterAsText(set_i, folder_name); set_i = set_i + 1
SetParameterAsText(set_i, ludataperc); set_i = set_i + 1
SetParameterAsText(set_i, extentcheck); set_i = set_i + 1
SetParameterAsText(set_i, os.path.join(optfolder, "infstr_proj.shp")); set_i = set_i + 1



