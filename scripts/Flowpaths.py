# -*- coding: utf-8 -*-
"""
Modified 02/2021

@author: Javier.Mardones
"""

from arcpy import (GetParameterAsText,
                   env,
                   Delete_management,
                   SpatialReference,
                   Point,
                   PointGeometry,
                   DeleteRows_management,
                   Project_management,
                   SetParameterAsText)
from arcpy.sa import (CostPath,
                      Times,
                      StreamToFeature)
from arcpy.da import (SearchCursor as SearchCursorda,
                      InsertCursor as InsertCursorda)
import os

set_i = 0
projectname = GetParameterAsText(set_i); set_i = set_i + 1
x = GetParameterAsText(set_i); set_i = set_i + 1
y = GetParameterAsText(set_i); set_i = set_i + 1
clear_flowpaths = GetParameterAsText(set_i) == 'true'; set_i = set_i + 1

#get path from environment variable
directory = r"" + str(os.environ['GISHydro_DIR'])

optfolder = os.path.join(directory, "projects", projectname)

env.overwriteOutput = True
env.scratchWorkspace = optfolder
env.workspace = optfolder
env.snapRaster = os.path.join(optfolder, "dem_clip.tif")
env.extent = os.path.join(optfolder, "dem_clip.tif")

def coord_transf(x1,y1,sr1,sr2):
    pt1 = Point(x1,y1)
    ptgeo1 = PointGeometry(pt1, sr1)
    ptgeo2 = ptgeo1.projectAs(sr2)
    pt2 = ptgeo2.lastPoint
    x2 = float(pt2.X)
    y2 = float(pt2.Y)
    return x2, y2

auxwhile = True
i = 1
while auxwhile:
    lineshp = os.path.join(optfolder, "flowpath" + str(i) +".shp")
    auxwhile = os.path.isfile(lineshp)
    if auxwhile:
        i = i + 1

if clear_flowpaths:
    DeleteRows_management(os.path.join(optfolder, "addasstreams.shp"))
    for j in range(i):
        try:
            Delete_management(os.path.join(optfolder, "flowpath" + str(j+1) +".shp"))
            Delete_management(os.path.join(optfolder, "flowpath" + str(j+1) +"_proj.shp"))
        except:
            pass
    SetParameterAsText(set_i, False); set_i = set_i + 1
    SetParameterAsText(set_i, os.path.join(optfolder, "addasstreams.shp")); set_i = set_i + 1

else:

    sr_map = SpatialReference(4326)
    sr_md = SpatialReference(26985)
    xmd, ymd = coord_transf(float(x), float(y), sr_map, sr_md)

    point = Point(xmd, ymd)
    ptGeometry = PointGeometry(point)
    theLine = CostPath(ptGeometry, os.path.join(optfolder, "dem_clip.tif"), os.path.join(optfolder, "flowdir.tif"), "BEST_SINGLE")
    theLine_masked = Times(theLine, os.path.join(optfolder, "basingrid.tif"))
    StreamToFeature(theLine_masked, os.path.join(optfolder, "flowdir.tif"), os.path.join(optfolder, "flowpath" + str(i) +".shp"), "NO_SIMPLIFY")

    searchcursor = SearchCursorda(os.path.join(optfolder, "flowpath" + str(i) +".shp"), ("OID@", "SHAPE@"))
    firstrow = searchcursor.next()
    insertcursor = InsertCursorda(os.path.join(optfolder, "addasstreams.shp"), ("OID@", "SHAPE@"))
    insertcursor.insertRow(firstrow)

    Project_management(os.path.join(optfolder, "flowpath" + str(i) + ".shp"), os.path.join(optfolder, "flowpath" + str(i) + "_proj.shp"), sr_map)
    SetParameterAsText(set_i, True); set_i = set_i + 1
    SetParameterAsText(set_i, os.path.join(optfolder, "flowpath" + str(i) + "_proj.shp")); set_i = set_i + 1