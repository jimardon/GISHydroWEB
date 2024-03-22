# -*- coding: utf-8 -*-
"""
Modified 02/2021

@author: Javier.Mardones
"""

from arcpy import (GetParameterAsText,
                   env,
                   GetRasterProperties_management,
                   SetParameterAsText)
from arcpy.sa import Times
import json
import os

set_i = 0
projectname = GetParameterAsText(set_i); set_i = set_i + 1
cb_list = json.loads(GetParameterAsText(set_i)); set_i = set_i + 1
upper90 = GetParameterAsText(set_i) == 'true'; set_i = set_i + 1

#get path from environment variable
directory = r"" + str(os.environ['GISHydro_DIR'])

optfolder = os.path.join(directory, "projects", projectname)

noaaatlasgdb = os.path.join(directory, "data","noaaprecip.gdb")

env.overwriteOutput = True
env.scratchWorkspace = optfolder
env.workspace = optfolder
env.snapRaster = os.path.join(optfolder, "dem_clip.tif")


# ******************************************************************************************************
# Use selected duration and year to compute average precipitation
# ******************************************************************************************************

yearlist = ["1", "2", "5", "10", "25", "50", "100", "200", "500"]
durlist = ["06", "12", "24", "48"]

thecritavg = []
year = []
duration = []
for cb in cb_list:

    # following year and duration list is to create avg prec list
    theyear = yearlist[cb // 4]  # "//" will floor the value to get respective indexed year from above
    thecritdur = durlist[cb % 4]
    year.append(theyear)
    duration.append(thecritdur)

    if upper90:
        thefilename = os.path.join(noaaatlasgdb, "p" + theyear + "yr" + thecritdur + "hau")
    else:
        thefilename = os.path.join(noaaatlasgdb, "p" + theyear + "yr" + thecritdur + "ha")

    basingrid = Times(os.path.join(optfolder, "basingrid.tif"), thefilename)
    precavg = GetRasterProperties_management(basingrid, "MEAN")
    precavg = float(precavg.getOutput(0))

    thecritavg.append(round(precavg/1000, 2))


SetParameterAsText(set_i, json.dumps(thecritavg)); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(year)); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(duration)); set_i = set_i + 1