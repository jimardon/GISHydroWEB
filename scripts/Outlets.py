# -*- coding: utf-8 -*-
"""
Modified 02/2021

@author: Javier.Mardones
"""

from arcpy import (GetParameterAsText,
                   env,
                   DeleteRows_management,
                   SpatialReference,
                   Point,
                   PointGeometry,
                   RasterToPoint_conversion,
                   Delete_management,
                   management,
                   SetParameterAsText)
from arcpy.sa import (SnapPourPoint,
                      Raster)
from arcpy.da import InsertCursor
from arcpy.da import SearchCursor as SearchCursorda
import os

set_i = 0
projectname = GetParameterAsText(set_i); set_i = set_i + 1
x = float(GetParameterAsText(set_i)); set_i = set_i + 1
y = float(GetParameterAsText(set_i)); set_i = set_i + 1
clear_outlets = GetParameterAsText(set_i) == 'true'; set_i = set_i + 1

#get path from environment variable
directory = r"" + str(os.environ['GISHydro_DIR'])

optfolder = os.path.join(directory, "projects", projectname)

env.overwriteOutput = True
env.scratchWorkspace = optfolder
env.workspace = optfolder
env.snapRaster = os.path.join(optfolder, "dem_clip.tif")

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

if clear_outlets:
    DeleteRows_management(os.path.join(optfolder, "addasoutlets.shp"))
    SetParameterAsText(set_i, False); set_i = set_i + 1

else:
    xmd, ymd = coord_transf(x, y, sr_map, sr_md)
    rast = Raster(os.path.join(optfolder, "infstreams.tif"))
    cellsize = rast.meanCellWidth
    point = PointGeometry(Point(xmd, ymd), sr_md)
    outletSnap = SnapPourPoint(point, rast, cellsize)
    outlet_point = RasterToPoint_conversion(outletSnap, os.path.join(optfolder, "outletSnap.shp"))
    for row in SearchCursorda(outlet_point, ["SHAPE@XY"]):
        xnew, ynew = row[0]
    xy = (xnew, ynew)
    outletxy = management.GetCellValue(os.path.join(optfolder, "infstreams.tif"), "{} {}".format(xnew, ynew))
    if outletxy.getOutput(0).isnumeric():
        cursor = InsertCursor(os.path.join(optfolder, "addasoutlets.shp"), ("SHAPE@XY"))
        cursor.insertRow([xy])
        SetParameterAsText(set_i, True); set_i = set_i + 1
    else:
        SetParameterAsText(set_i, False); set_i = set_i + 1

    try:
        Delete_management(os.path.join(optfolder, "outletxy.tif"), "")
        Delete_management(os.path.join(optfolder, "outletSnap.shp"),"")
    except:
        pass