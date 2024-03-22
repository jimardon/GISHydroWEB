# -*- coding: utf-8 -*-
"""
Created on Mon Jun 28 11:27:19 2021

@author: Javier.Mardones
"""

from arcpy import (GetParameterAsText,
                   env,
                   SpatialReference,
                   RasterToPolygon_conversion,
                   Dissolve_management,
                   Project_management,
                   UpdateCursor,
                   Delete_management,
                   Merge_management,
                   SetParameterAsText)
from arcpy.sa import (Contour, Times)
import os

#get path from environment variable
directory = r"" + str(os.environ['GISHydro_DIR'])
sr_map = SpatialReference(4326)

set_i = 0
projectname = GetParameterAsText(set_i); set_i = set_i + 1
userchoice = GetParameterAsText(set_i); set_i = set_i + 1
contourInterval = float(GetParameterAsText(set_i)); set_i = set_i + 1
baseContour = float(GetParameterAsText(set_i)); set_i = set_i + 1
reaches = int(GetParameterAsText(set_i)); set_i = set_i + 1

optfolder = os.path.join(directory, "projects", projectname)

env.overwriteOutput = True
env.scratchWorkspace = optfolder
env.workspace = optfolder
env.snapRaster = os.path.join(optfolder, "dem_clip.tif")
env.extent = os.path.join(optfolder, "dem_clip.tif")

def contours(optfolder, sr_map, set_i, contourInterval, baseContour):

    contours = Times(os.path.join(optfolder, "dem_clip.tif"), os.path.join(optfolder, "basingrid.tif"))
    contours = Contour(contours, os.path.join(optfolder, "contours.shp"), contourInterval, baseContour)
    Project_management(contours, os.path.join(optfolder, "contours_aux.shp"), sr_map)

    cont = UpdateCursor(os.path.join(optfolder, "contours_aux.shp"))
    for c in cont:
        c.ID = 1
        cont.updateRow(c)

    Dissolve_management(os.path.join(optfolder, "contours_aux.shp"), os.path.join(optfolder, "contours_proj.shp"), "ID")

    SetParameterAsText(set_i, os.path.join(optfolder, "contours_proj.shp")); set_i = set_i + 1
    
    try:
        Delete_management(os.path.join(optfolder, "contours_aux.shp"))
    except:
        pass

def longpath(optfolder, sr_map, set_i, subareas):

    paths = []
    for i in range(subareas):
        paths.append(os.path.join(optfolder, "Longest_Path_Sub_" + str(i+1) + ".shp"))

    Merge_management(paths, os.path.join(optfolder, "paths_aux.shp"))

    Project_management(os.path.join(optfolder, "paths_aux.shp"), os.path.join(optfolder, "paths_proj.shp"), sr_map)
    SetParameterAsText(set_i, os.path.join(optfolder, "paths_proj.shp")); set_i = set_i + 1

    try:
        Delete_management(os.path.join(optfolder, "paths_aux.shp"))
    except:
        pass

def landuse(optfolder, sr_map, set_i):

    RasterToPolygon_conversion(os.path.join(optfolder, "landuse.tif"), os.path.join(optfolder, "landuse_aux.shp"),"NO_SIMPLIFY","CLASS_NAME")
    Dissolve_management(os.path.join(optfolder, "landuse_aux.shp"), os.path.join(optfolder, "landuse.shp"), "CLASS_NAME")
    Project_management(os.path.join(optfolder, "landuse.shp"), os.path.join(optfolder, "landuse_proj.shp"), sr_map)

    SetParameterAsText(set_i, os.path.join(optfolder, "landuse_proj.shp")); set_i = set_i + 1

    try:
        Delete_management(os.path.join(optfolder, "landuse.shp"))
        Delete_management(os.path.join(optfolder, "landuse_aux.shp"))
    except:
        pass

def soils(optfolder, sr_map, set_i):

    RasterToPolygon_conversion(os.path.join(optfolder, "soils.tif"), os.path.join(optfolder, "soils_aux.shp"),"NO_SIMPLIFY","Value")
    Dissolve_management(os.path.join(optfolder, "soils_aux.shp"), os.path.join(optfolder, "soils.shp"), "gridcode")
    Project_management(os.path.join(optfolder, "soils.shp"), os.path.join(optfolder, "soils_proj.shp"), sr_map)

    SetParameterAsText(set_i, os.path.join(optfolder, "soils_proj.shp")); set_i = set_i + 1

    try:
        Delete_management(os.path.join(optfolder, "soils.shp"))
        Delete_management(os.path.join(optfolder, "soils_aux.shp"))
    except:
        pass

def curvenumber(optfolder, sr_map, set_i):

    RasterToPolygon_conversion(os.path.join(optfolder, "curvenumber.tif"), os.path.join(optfolder, "curvenumber_aux.shp"),"NO_SIMPLIFY","Value")
    Dissolve_management(os.path.join(optfolder, "curvenumber_aux.shp"), os.path.join(optfolder, "curvenumber.shp"), "gridcode")
    Project_management(os.path.join(optfolder, "curvenumber.shp"), os.path.join(optfolder, "curvenumber_proj.shp"), sr_map)

    SetParameterAsText(set_i, os.path.join(optfolder, "curvenumber_proj.shp")); set_i = set_i + 1

    try:
        Delete_management(os.path.join(optfolder, "curvenumber.shp"))
        Delete_management(os.path.join(optfolder, "curvenumber_aux.shp"))
    except:
        pass

if userchoice == "Contours":
    contours(optfolder, sr_map, set_i, contourInterval, baseContour)
elif userchoice == "Longest Path":
    longpath(optfolder, sr_map, set_i, reaches)
elif userchoice == "Land Use":
    landuse(optfolder, sr_map, set_i)
elif userchoice == "Soils":
    soils(optfolder, sr_map, set_i)
elif userchoice == "Curve Number":
    curvenumber(optfolder, sr_map, set_i)
