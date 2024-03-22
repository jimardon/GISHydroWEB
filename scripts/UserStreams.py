# -*- coding: utf-8 -*-
"""
Created on Sat Apr 23 13:21:14 2022

@author: Javier.Mardones
"""

from arcpy import (GetParameterAsText,
                   env,
                   Extent,
                   Array,
                   Point,
                   Polyline,
                   PointGeometry,
                   Polygon,
                   Clip_analysis,
                   PolylineToRaster_conversion,
                   Describe,
                   RasterToPolygon_conversion,
                   Merge_management,
                   CreateFeatureclass_management,
                   CopyFeatures_management,
                   SpatialReference,
                   Project_management,
                   Clip_management,
                   Dissolve_management,
                   SetParameterAsText)
from arcpy.sa import (IsNull,
                      Minus,
                      Times,
                      Plus,
                      Fill,
                      FlowDirection,
                      FlowAccumulation,
                      GreaterThanEqual,
                      Con)
from arcpy.da import InsertCursor as InsertCursorda
import os
import json
import time

set_i = 0
proj_name = GetParameterAsText(set_i).replace(" ", "_"); set_i = set_i + 1
dem_layer = GetParameterAsText(set_i); set_i = set_i + 1
extent = GetParameterAsText(set_i); set_i = set_i + 1
userflag = GetParameterAsText(set_i) == "true"; set_i = set_i + 1
usrstreams = GetParameterAsText(set_i); set_i = set_i + 1
nhdopt = GetParameterAsText(set_i); set_i = set_i + 1
acc_thr = float(GetParameterAsText(set_i)); set_i = set_i + 1


#get path from environment variable
directory = r"" + str(os.environ['GISHydro_DIR'])
directorygdb = os.path.join(directory, "data","gishydro.gdb")
demgdb = os.path.join(directory, "data","dem.gdb")

dem = os.path.join(demgdb, dem_layer)

sr_map = SpatialReference(4326)
sr_md = SpatialReference(26985)

temp_folder = os.path.join(directory, "projects")
if not os.path.exists(temp_folder):
    os.mkdir(temp_folder, 0o755)
folder_name = time.strftime("%Y%m%d_%H%M%S") + "_" + proj_name
optfolder = os.path.join(temp_folder, folder_name)
os.mkdir(optfolder)

env.overwriteOutput = True
env.scratchWorkspace = optfolder
env.workspace = optfolder
env.snapRaster = os.path.join(demgdb, dem_layer)

def coord_transf(x1,y1,sr1,sr2):
    pt1 = Point(x1,y1)
    ptgeo1 = PointGeometry(pt1, sr1)
    ptgeo2 = ptgeo1.projectAs(sr2)
    pt2 = ptgeo2.lastPoint
    x2 = float(pt2.X)
    y2 = float(pt2.Y)
    return x2, y2


extent = json.loads(extent)

coordinates = extent['geometry']['coordinates'][0]
east = float(coordinates[0][0])
north = float(coordinates[1][1])
west = float(coordinates[2][0])
south = float(coordinates[3][1])

east, north = coord_transf(east, north, sr_map, sr_md)
west, south = coord_transf(west, south, sr_map, sr_md)

extent_clip = Extent(east, south, west, north)
env.extent = extent_clip

array = Array()
array.add(Point(extent_clip.XMin, extent_clip.YMin))
array.add(Point(extent_clip.XMin, extent_clip.YMax))
array.add(Point(extent_clip.XMax, extent_clip.YMax))
array.add(Point(extent_clip.XMax, extent_clip.YMin))
array.add(Point(extent_clip.XMin, extent_clip.YMin))
mask_layer = Polygon(array,sr_md)

dem_clip = os.path.join(optfolder, "dem_ext.tif")

mask = os.path.join(optfolder, "mask.shp")
CopyFeatures_management(mask_layer, mask)
Clip_management(dem, "", dem_clip, mask)

CreateFeatureclass_management(optfolder, "userstreams.shp", "POLYLINE", "", "ENABLED", "DISABLED", sr_md)

if userflag:

    usrstreams = json.loads(usrstreams)

    for i,linefeatures in enumerate(usrstreams['features']):

        coordinates = linefeatures['geometry']['coordinates']
        arcpoints = []
        for coord in coordinates:
            x,y = coord_transf(float(coord[0]),float(coord[1]),sr_map,sr_md)
            arcpoints.append(Point(x,y))
        array = Array(arcpoints)
        polyline = Polyline(array)

        insertcursor = InsertCursorda(os.path.join(optfolder, "userstreams.shp"), ("OID@", "SHAPE@"))
        insertcursor.insertRow([i,polyline])

if nhdopt == "1" or nhdopt == "2":

    nhd = os.path.join(directorygdb, "nhd_streams_mr")
    if nhdopt == "2":
        nhd = os.path.join(directorygdb, "nhd_streams_hr")
    Clip_analysis(nhd, mask, os.path.join(optfolder, "nhd_strs.shp"))

    Merge_management([os.path.join(optfolder, "userstreams.shp"), os.path.join(optfolder, "nhd_strs.shp")], os.path.join(optfolder, "burn.shp"))

    try:
        PolylineToRaster_conversion(os.path.join(optfolder, "burn.shp"), "FID", os.path.join(optfolder, "nhd_rast.tif"), "", "", dem)
    except:
        PolylineToRaster_conversion(os.path.join(optfolder, "burn.shp"), "OBJECTID", os.path.join(optfolder, "nhd_rast.tif"), "", "", dem)

    burn = 100
    calc1 = IsNull(os.path.join(optfolder, "nhd_rast.tif"))
    calc2 = Minus(calc1, 1)
    calc1 = Times(calc2, -1 * burn)
    calc2 = Minus(dem_clip, calc1)
    burned = Plus(calc2, burn)
    burned.save(os.path.join(optfolder, "burned.tif"))

    fill = Fill(os.path.join(optfolder, "burned.tif"))
    fill.save(os.path.join(optfolder, "fill.tif"))

else:
    if userflag:

        try:
            PolylineToRaster_conversion(os.path.join(optfolder, "userstreams.shp"), "FID", os.path.join(optfolder, "user_rast.tif"), "", "", dem)
        except:
            PolylineToRaster_conversion(os.path.join(optfolder, "userstreams.shp"), "OBJECTID", os.path.join(optfolder, "user_rast.tif"), "", "", dem)

        burn = 100
        calc1 = IsNull(os.path.join(optfolder, "user_rast.tif"))
        calc2 = Minus(calc1, 1)
        calc1 = Times(calc2, -1 * burn)
        calc2 = Minus(dem_clip, calc1)
        burned = Plus(calc2, burn)
        burned.save(os.path.join(optfolder, "burned.tif"))
        fill = Fill(os.path.join(optfolder, "burned.tif"))
        fill.save(os.path.join(optfolder, "fill.tif"))

    else:

        fill = Fill(os.path.join(optfolder, "dem_ext.tif"))
        fill.save(os.path.join(optfolder, "fill.tif"))

flowdir = FlowDirection(fill)
flowdir.save(os.path.join(optfolder, "flowdir_ext.tif"))

flowacc = FlowAccumulation(flowdir)
flowacc.save(os.path.join(optfolder, "flowacc_ext.tif"))

faccdesc = Describe(flowacc)
cellSize = faccdesc.meanCellHeight
srcpixel = float(acc_thr)/ pow(cellSize, 2) /0.000247
infstr = Con(flowacc >= int(srcpixel), flowacc)
streams = GreaterThanEqual(infstr, 1)
streams.save(os.path.join(optfolder, "infstr_ext.tif"))

RasterToPolygon_conversion(streams, os.path.join(optfolder, "infstr_aux.shp"),"NO_SIMPLIFY","VALUE")
Dissolve_management(os.path.join(optfolder, "infstr_aux.shp"), os.path.join(optfolder, "infstr.shp"), "gridcode")
Project_management(os.path.join(optfolder, "infstr.shp"), os.path.join(optfolder, "infstr_proj.shp"), sr_map)

SetParameterAsText(set_i, folder_name); set_i = set_i + 1
SetParameterAsText(set_i, os.path.join(optfolder, "infstr_proj.shp")); set_i = set_i + 1



