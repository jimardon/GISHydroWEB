# -*- coding: utf-8 -*-
"""
Modified 08/2021

@author: Javier.Mardones
"""

from arcpy import (GetParameterAsText,
                   env,
                   Extent,
                   Point,
                   PointGeometry,
                   Raster,
                   RasterToPoint_conversion,
                   SpatialReference,
                   management,
                   SetParameterAsText)
from arcpy.sa import SnapPourPoint
from arcpy.da import SearchCursor as SearchCursorda
import os
import json

set_i = 0
mouse_lat_proj = float(GetParameterAsText(set_i)); set_i = set_i + 1
mouse_lon_proj = float(GetParameterAsText(set_i)); set_i = set_i + 1
cellsize = int(GetParameterAsText(set_i)); set_i = set_i + 1
userstream = GetParameterAsText(set_i) == "true"; set_i = set_i + 1
projectname = GetParameterAsText(set_i); set_i = set_i + 1

#get path from environment variable
directory = r"" + str(os.environ['GISHydro_DIR'])

if userstream:
    optfolder = os.path.join(directory, "projects")
    optfolder = os.path.join(optfolder, projectname)
    infstreams = os.path.join(optfolder, "infstr_ext.tif")
else:
    infstreams = os.path.join(directory, "data","hydro30.gdb", "infstreams30")
    if cellsize == 10:
        infstreams = os.path.join(directory, "data","hydro10.gdb", "infstreams10")

try:
    versionfile = os.path.join(directory, "data", "gpversion.txt")
    with open(versionfile) as f:
        gpversion = f.readlines()
except:
    gpversion = ["-"]

sr_map = SpatialReference(4326)
sr_md = SpatialReference(26985)

def coord_transf(x1,y1,sr1,sr2):
    pt1 = Point(x1,y1)
    ptgeo1 = PointGeometry(pt1, sr1)
    ptgeo2 = ptgeo1.projectAs(sr2)
    pt2 = ptgeo2.lastPoint
    x2 = float(pt2.X)
    y2 = float(pt2.Y)
    return x2, y2

x, y = coord_transf(mouse_lon_proj, mouse_lat_proj, sr_map, sr_md)
rast = Raster(infstreams)
cellsize = rast.meanCellWidth
point = PointGeometry(Point(x, y))

env.overwriteOutput = True
env.extent = Extent(x-cellsize, y-cellsize, x+cellsize, y+cellsize)
env.snapRaster = infstreams

outSnapPour = SnapPourPoint(point, infstreams, cellsize)

pour_point = RasterToPoint_conversion(outSnapPour)

for row in SearchCursorda(pour_point, ["SHAPE@XY"]):
    x, y = row[0]
outletxy = management.GetCellValue(infstreams, "{} {}".format(x, y))

xmap, ymap = coord_transf(x, y, sr_md, sr_map)

if outletxy.getOutput(0).isnumeric():
    SetParameterAsText(set_i, True); set_i = set_i + 1
else:
    SetParameterAsText(set_i, False); set_i = set_i + 1

SetParameterAsText(set_i, pour_point); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps([xmap, ymap])); set_i = set_i + 1
SetParameterAsText(set_i, gpversion[0]); set_i = set_i + 1
del pour_point, outletxy, outSnapPour




