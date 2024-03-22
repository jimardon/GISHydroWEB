# -*- coding: utf-8 -*-
"""
Modified 08/2021

@author: Javier.Mardones
"""
from arcpy import (RasterToPolygon_conversion,
                   Intersect_analysis,
                   env,
                   Dissolve_management,
                   CalculateField_management,
                   GetParameterAsText,
                   Raster,
                   SearchCursor,
                   GetRasterProperties_management,
                   Describe,
                   Shift_management,
                   BuildRasterAttributeTable_management,
                   DeleteField_management,
                   AddField_management,
                   Buffer_analysis,
                   ListFields,
                   Delete_management,
                   SetParameterAsText)
from arcpy.sa import (Times,
                      FlowLength,
                      Con,
                      IsNull,
                      Minus,
                      SetNull,
                      Log2,
                      Divide,
                      ExtractByMask,
                      ZonalStatisticsAsTable)
from arcpy.da import SearchCursor as SearchCursorda
from arcpy.management import GetCellValue
import os
import json

### Input

set_i = 0
projectname = GetParameterAsText(set_i); set_i = set_i + 1
landuse = GetParameterAsText(set_i); set_i = set_i + 1
hyd = GetParameterAsText(set_i); set_i = set_i + 1

#get path from environment variable
directory = r"" + str(os.environ['GISHydro_DIR'])
directorygdb = os.path.join(directory, "data","gishydro.gdb")
soilsgdb = os.path.join(directory, "data","soils.gdb")

optfolder = os.path.join(directory, "projects")
optfolder = os.path.join(optfolder, projectname)

noaaprecipgdb = os.path.join(directory, "data","noaaprecip.gdb")

# paths

basingrid = os.path.join(optfolder, "basingrid.tif")
elevgrid = os.path.join(optfolder, "dem_clip.tif")
landuse_path = os.path.join(optfolder, "landuse.tif")
soils_path = os.path.join(optfolder, "soils.tif")
wats_lime = os.path.join(optfolder, "wats_lime.shp")
lime_int = os.path.join(optfolder, "lime_int.shp")
dirgrid = os.path.join(optfolder, "flowdir.tif")

prov = os.path.join(directorygdb, "Mdprov")
province = os.path.join(directorygdb, "provlines")
mapstpm = os.path.join(directorygdb, "mapstpm")
prec_grid = os.path.join(noaaprecipgdb, "p2yr24ha")
limestonem = os.path.join(directorygdb, "limestonem")

# Environmental variables

env.overwriteOutput = True
env.scratchWorkspace = optfolder
env.workspace = optfolder
env.snapRaster = elevgrid

### BASIN COMPOSITION

## convert all clipped rasters to polygons
lu_poly = RasterToPolygon_conversion(landuse_path, os.path.join(optfolder, "lu_poly.shp"), "NO_SIMPLIFY", "VALUE")
soil_poly = RasterToPolygon_conversion(soils_path, os.path.join(optfolder, "soil_poly.shp"), "NO_SIMPLIFY", "VALUE")

## intersect land use and soil to prepare two polygons: "lu_soil" and "lu_cn"
Intersect_analysis([lu_poly, soil_poly], os.path.join(optfolder, "lu_soil.shp"), "ALL", "#", "INPUT")

## dissolve above intersected polygon
Dissolve_management(os.path.join(optfolder, "lu_soil.shp"), os.path.join(optfolder, "lu_soil_diss.shp"), "GRIDCODE;GRIDCODE_1", "#", "MULTI_PART", "DISSOLVE_LINES")

## add filed to both of above dissolved polygons and compute area in acres
if not len(ListFields(os.path.join(optfolder, "lu_soil_diss.shp"), "area")) > 0:
    AddField_management(os.path.join(optfolder, "lu_soil_diss.shp"), "area", "FLOAT", 15, 4)
CalculateField_management(os.path.join(optfolder, "lu_soil_diss.shp"), "area", "!shape.area@acres!", "PYTHON")

# prepre a list of lu codes to feed into lu_description function in order to obtain matching descriptions list
lu_match = []
sc = SearchCursor(landuse_path, "", "", "VALUE", "")
for i in sc:
    v = i.getValue("VALUE")
    lu_match.append(v)

# create list of lists with zeroes
soil_acre_lists = [[0, 0, 0, 0] for i in range(len(lu_match))]

# preapre a list of soil acreage using lu_match list
lc_soil_diss = []
soil_lc_diss = []
lc_soil_aa = []
lu_soil_sc = SearchCursor(os.path.join(optfolder, "lu_soil_diss.shp"), "", "", "GRIDCODE;GRIDCODE_1;area", "")
for s in lu_soil_sc:
    lc = s.getValue("GRIDCODE")
    lc_soil_diss.append(lc)
    sc = s.getValue("GRIDCODE_1")
    soil_lc_diss.append(sc)
    aa = s.getValue("area")
    lc_soil_aa.append(round(aa, 2))

for idx, lu in enumerate(lu_match):
    for l, s, a in zip(lc_soil_diss, soil_lc_diss, lc_soil_aa):
        if l == lu:
            soil_acre_lists[idx][int(s) - 1] = a

# prepare matching list of lu description using lu codes from lu raster of watershed
if landuse == "nlcd2011" or landuse == "nlcd2006" or landuse == "nlcd2016" or landuse == "nlcd2001" or landuse == "nlcd2019":
    if hyd == "Fair":
        lut_file = os.path.join(directory, "data","lookup","nlcdlookupfair.txt")
    elif hyd == "Good":
        lut_file = os.path.join(directory, "data","lookup","nlcdlookupgood.txt")
    elif hyd == "Poor":
        lut_file = os.path.join(directory, "data","lookup","nlcdlookuppoor.txt")

if landuse == "lu97m" or landuse == "mdplu2002" or landuse == "mdp2010":
    if hyd == "Fair":
        lut_file = os.path.join(directory, "data","lookup","andlookupfair.txt")
    elif hyd == "Good":
        lut_file = os.path.join(directory, "data","lookup","andlookupgood.txt")
    elif hyd == "Poor":
        lut_file = os.path.join(directory, "data","lookup","andlookuppoor.txt")

if landuse == "mdplu2002":
    if hyd == "Fair":
        lut_file = os.path.join(directory, "data","lookup","andlookupfair.txt")
    elif hyd == "Good":
        lut_file = os.path.join(directory, "data","lookup","andlookupgood.txt")
    elif hyd == "Poor":
        lut_file = os.path.join(directory, "data","lookup","andlookuppoor.txt")

if landuse == "mdde2002":
    if hyd == "Fair":
        lut_file = os.path.join(directory, "data","lookup","mddelookupfair.txt")
    elif hyd == "Good":
        lut_file = os.path.join(directory, "data","lookup","mddelookupgood.txt")
    elif hyd == "Poor":
        lut_file = os.path.join(directory, "data","lookup","mddelookuppoor.txt")

if landuse == "luult":
    if hyd == "Fair":
        lut_file = os.path.join(directory, "data","lookup","zoninglookupfair.txt")
    elif hyd == "Good":
        lut_file = os.path.join(directory, "data","lookup","zoninglookupgood.txt")
    elif hyd == "Poor":
        lut_file = os.path.join(directory, "data","lookup","zoninglookuppoor.txt")

if landuse == "mrlc":
    if hyd == "Fair":
        lut_file = os.path.join(directory, "data","lookup","mrlclookupfair.txt")
    elif hyd == "Good":
        lut_file = os.path.join(directory, "data","lookup","mrlclookupgood.txt")
    elif hyd == "Poor":
        lut_file = os.path.join(directory, "data","lookup","mrlclookuppoor.txt")

if landuse == "lu70":
    if hyd == "Fair":
        lut_file = os.path.join(directory, "data","lookup","usgslookupfair.txt")
    elif hyd == "Good":
        lut_file = os.path.join(directory, "data","lookup","usgslookupgood.txt")
    elif hyd == "Poor":
        lut_file = os.path.join(directory, "data","lookup","usgslookuppoor.txt")

# run hydro function to obtain land use description of categories present in watershed MODIFIED 2020
lu_code = []
lu_desc = []
with open(lut_file, "r") as f:
    next(f)
    for line in f:
        lu_strip = line.split("\t")[0] # lu code
        lu_code.append(lu_strip)
        dc_strip = line.split("\t")[1] # lu description
        lu_desc.append(dc_strip)
#convert lu_code to integer
lu_code = [int(i) for i in lu_code]
d_new = dict(zip(lu_code,lu_desc))
rev1 = {v:k for v,k in d_new.items()}
lu_desc = [rev1.get(item,item)  for item in lu_match]


# sum list of lists separately and cat at the end of lu description
total_area = [round(sum(i),2) for i in zip(*soil_acre_lists)]

# loop over land use, related total acreage, percent of land covered by this lu category, and A-B-C-D curve numbers
curve_num = []
for l in lu_match:
    with open(lut_file, "r") as f:
        next(f)
        for line in f:
            luc = line.split("\t")[0]
            if int(l) == int(luc):
                temp = []
                A = line.split("\t")[2]  # CN A
                temp.append(A)
                B = line.split("\t")[3]  # CN B
                temp.append(B)
                C = line.split("\t")[4]  # CN C
                temp.append(C)
                D = line.split("\t")[5]  # CN D
                temp.append(D)
                curve_num.append(temp)

# sum areas for each sub-list individually
acres = [round(sum(i),2) for i in soil_acre_lists]
total_all = sum(total_area)
area_percent = [round(float(ac_x / total_all) * 100, 2) for ac_x in acres]

sumcn = [sum(float(a)*float(b) for a,b in zip(*rows)) for rows in zip(soil_acre_lists, curve_num)]
avgCN = round(sum([float(b)*float(a)/100/float(c) for a,b,c in zip(area_percent,sumcn,acres)]),2)


### BASIN STATISTICS

# *******************************************************************************************************
# Warning messages
# *******************************************************************************************************
Impwarntext = """
        IMPERVIOUS AREA IN WATERSHED EXCEEDS 10%.
        Calculated discharges from USGS Regression
        Equations may not be appropriate.
                 """
provwarntext = """
        Watershed is within 5km of physiographic
        province boundary.  You should consider
        sensitivity of discharges to region location.
                 """
limewarntext = """
        Watershed is within 1km of underlying limestone
        geology.  You should consider sensitivity
        of discharges to percent limestone calculated.
                 """

# *******************************************************************************************************
# Get outlet coordinates and prepare masked grids for calculations
# *******************************************************************************************************
out_rast = Raster(elevgrid)
cellsize = out_rast.meanCellWidth
cellsq = cellsize * cellsize

# Get basingrid count [number of pixels]
shedtab = SearchCursor(basingrid, "", "", "Count", "")
for row in shedtab:
    basinarea = row.getValue("Count")

# *******************************************************************************************************
# Compute channel and land slope
# *******************************************************************************************************

elevclip = Times(elevgrid, basingrid)
basindirgrid = Times(dirgrid, basingrid)

# check names and number of input files as function input arguments carefully
dGrid = FlowLength(basindirgrid, "DOWNSTREAM", "")      # saved all rasters at optfolder, to extract raster properties
uGrid = FlowLength(basindirgrid, "UPSTREAM", "")
sGrid = dGrid + uGrid
sGrid.save(os.path.join(optfolder, "maxlength.tif"))
maxlen = GetRasterProperties_management(uGrid, "MAXIMUM") # 05/02/2013: changed name from "maxlength" to "maxlen
maxlen = float(maxlen.getOutput(0))

tolerance = (0.1)* cellsize
Lpath = Con(sGrid > (maxlen - tolerance), Minus(1,sGrid))
Lpath = IsNull(Lpath)
long_path = Con(Lpath == 0, 1, 0)
lpath_upgrid = Times(long_path,uGrid)
maxlen_09 = float(0.9*maxlen)
maxlen_15 = float(0.15*maxlen)
lpath_09 = Con(lpath_upgrid < maxlen_09, lpath_upgrid, 0)
lpath_1085 = Con(lpath_09 > maxlen_15, lpath_09, 0)
long_1085 = SetNull(lpath_1085,1,"VALUE = 0")
long_elev = Times(long_1085,elevclip)

maxlength = float(maxlen* (0.000621371))
elevmin = GetRasterProperties_management(long_elev, "MINIMUM")
elevmax = GetRasterProperties_management(long_elev, "MAXIMUM")
min_elev = float(elevmin.getOutput(0))
max_elev = float(elevmax.getOutput(0))
theslope = float((max_elev) - (min_elev))/(maxlength* (0.75)) # units: xxx feet/mile
theslope_feet = float(theslope / 5280.0)

# SLOPE GRID:

def gishydroslope(eg,dg,cs,of):

    dlgrid = Times(Con(((Log2(dg)) % 2) > 0, pow(2, 0.5), 1), cs)

    shift_temp1 = Divide(Minus(eg, Shift_management(eg, os.path.join(of, "dir_shift_1.tif"), -cs, 0)), dlgrid)
    shift_temp2 = Divide(Minus(eg, Shift_management(eg, os.path.join(of, "dir_shift_2.tif"), -cs, cs)), dlgrid)
    shift_temp3 = Divide(Minus(eg, Shift_management(eg, os.path.join(of, "dir_shift_4.tif"), 0, cs)), dlgrid)
    shift_temp4 = Divide(Minus(eg, Shift_management(eg, os.path.join(of, "dir_shift_8.tif"), cs, cs)), dlgrid)
    shift_temp5 = Divide(Minus(eg, Shift_management(eg, os.path.join(of, "dir_shift_16.tif"), cs, 0)), dlgrid)
    shift_temp6 = Divide(Minus(eg, Shift_management(eg, os.path.join(of, "dir_shift_32.tif"), cs, -cs)), dlgrid)
    shift_temp7 = Divide(Minus(eg, Shift_management(eg, os.path.join(of, "dir_shift_64.tif"), 0, -cs)), dlgrid)
    shift_temp8 = Divide(Minus(eg, Shift_management(eg, os.path.join(of, "dir_shift_128.tif"), -cs, -cs)), dlgrid)


    slopecon128 = Con(dg, shift_temp8, 0, "VALUE=128")
    slopecon64 = Con(dg, shift_temp7, slopecon128, "VALUE=64")
    slopecon32 = Con(dg, shift_temp6, slopecon64, "VALUE=32")
    slopecon16 = Con(dg, shift_temp5, slopecon32, "VALUE=16")
    slopecon8 = Con(dg, shift_temp4, slopecon16, "VALUE=8")
    slopecon4 = Con(dg, shift_temp3, slopecon8, "VALUE=4")
    slopecon2 = Con(dg, shift_temp2, slopecon4, "VALUE=2")
    slope = Con(dg, shift_temp1, slopecon2, "VALUE=1")

    # Slope value was going below 0 which isn't correct (raw dem used instead of filled). Condition is added to at least have 0.0001
    slopegrid = Con(slope > 0.0001, slope, 0.0001)
    slopegrid.save(os.path.join(of, "landslope.tif"))
    return slopegrid

#*******************************************************************************************************
# Calculate soil percentages using SSURGO for use in regression equations
#*******************************************************************************************************
# soil types are initialized with zero values before function arguments to avoid following error:
# UnboundLocalError: local variable referenced before assignment
#
def SSURGOPct(basinarea,ssurgo):
    pctAsoil = 0
    pctBsoil = 0
    pctCsoil = 0
    pctDsoil = 0
    pctWsoil = 0
    temptab = SearchCursor(ssurgo,"","","Value;Count","")
    for row in temptab:
        count = float(row.getValue("Count"))
        if row.getValue("Value") == 1:
            pctAsoil = pctAsoil + float((count/basinarea)* 100)
        elif row.getValue("Value") == 2:
            pctBsoil = pctBsoil + float((count/basinarea)* 100)
        elif row.getValue("Value") == 3:
            pctCsoil = pctCsoil + float((count/basinarea)* 100)
        elif row.getValue("Value") == 4:
            pctDsoil = pctDsoil + float((count/basinarea)* 100)
        elif row.getValue("Value") == -1:
            pctWsoil = pctWsoil + float((count/basinarea)* 100)


    return pctAsoil, pctBsoil, pctCsoil, pctDsoil, pctWsoil

ssurgo = Times(os.path.join(soilsgdb, "ssurgo_2021.tif"), basingrid)
pct = SSURGOPct(basinarea, ssurgo)
pctSoil = list(map(float, pct))
pctAsoil = float(pctSoil[0])
pctBsoil = float(pctSoil[1])
pctCsoil = float(pctSoil[2])
pctDsoil = float(pctSoil[3])
pctWsoil = float(pctSoil[4])

# *******************************************************************************************************
# Get LU count for Urban, Nil, Forest, and Storage -- it will be different for
# MOP, MD/DE, MRLC, and USGS
# *******************************************************************************************************
# *******************************************************************************************************
# Get Impervious count -- count will vary depending upon choice of input Landuse and Hyd condition
# *******************************************************************************************************

#*******************************************************************************************************
# Calculate LU cell count for delineated watershed -- LU count will vary based on landuse type
#*******************************************************************************************************

#*******************************************************************************************************
# Reclassify LU data to corresponding Imp values from NLCD table for Impervious area calculation
#*******************************************************************************************************

if landuse == "nlcd2011" or landuse == "nlcd2006" or landuse == "nlcd2001" or landuse == "nlcd2016" or landuse == "nlcd2019":
    lucount_file = os.path.join(directory, "data","lookup","nlcdlucount.txt")
    impcount_file = os.path.join(directory, "data","lookup","nlcdimpcount.txt")


elif landuse == "mdp2010" or landuse == "mdplu2002" or landuse == "lu97m":
    lucount_file = os.path.join(directory, "data","lookup","andlucount.txt")
    impcount_file = os.path.join(directory, "data","lookup","andimpcount.txt")

elif landuse == "mdde2002" or landuse == "luult":
    lucount_file = os.path.join(directory, "data","lookup","mddelucount.txt")
    impcount_file = os.path.join(directory, "data","lookup","mddeimpcount.txt")

elif landuse == "mrlc":
    lucount_file = os.path.join(directory, "data","lookup","mrlclucount.txt")
    impcount_file = os.path.join(directory, "data","lookup","mrlcimpcount.txt")

elif landuse == "lu70":
    lucount_file = os.path.join(directory, "data","lookup","usgslucount.txt")
    impcount_file = os.path.join(directory, "data","lookup","usgsimpcount.txt")

lucount_rows = []
with open(lucount_file, "r") as f:
    next(f)
    for line in f:
        lucount_rows.append(line.split("\t"))

impcount_rows = []
with open(impcount_file, "r") as f:
    next(f)
    for line in f:
        impcount_rows.append(line.split("\t"))

UrbPct = 0
FC = 0
ST = 0
IA = 0

lu_codes = [str(item[0]) for item in lucount_rows]

rows = SearchCursor(landuse_path, "", "", "Value;Count", "")
for row in rows:

    catvalue = lucount_rows[lu_codes.index(str(row.getValue("Value")))][1]
    if str(catvalue) == "1":
        UrbPct = UrbPct + int(row.getValue("Count"))/basinarea*100
    if str(catvalue) == "3":
        FC = FC + int(row.getValue("Count"))/basinarea*100
    if str(catvalue) == "4":
        ST = ST + int(row.getValue("Count"))/basinarea*100

    impvalue = impcount_rows[lu_codes.index(str(row.getValue("Value")))][1]
    IA = IA + int(impvalue)*int(row.getValue("Count"))/basinarea

del rows




# *******************************************************************************************************
# Get Limestone percent count
# *******************************************************************************************************

LIcnt = 0

#get geometry of single polygon in shapefile
with SearchCursorda(limestonem,['SHAPE@']) as cursor:
    for row in cursor: AOI_geom = row[0]

raster_extent = Describe(basingrid).extent
if raster_extent.overlaps(AOI_geom):

    limegrid = ExtractByMask(basingrid,limestonem)
    limegrid.save(os.path.join(optfolder, "limegrid.tif"))
    BuildRasterAttributeTable_management(os.path.join(optfolder, "limegrid.tif"), "Overwrite")
    with SearchCursorda(os.path.join(optfolder, "limegrid.tif"), "Count") as rows:
        for row in rows:
            LIcnt += row[0] or 0

LI = round(float((float(LIcnt) / basinarea) * 100),1)

areami2 = float((basinarea * cellsq) / 2588881)  # conversion into sq miles

# *******************************************************************************************************
# Get basin relief [it is difference of mean elevation and outlet elevation]
# *******************************************************************************************************
elev1 = GetRasterProperties_management(elevclip, "MEAN")
mean_elev = float(elev1.getOutput(0))

for row in SearchCursorda(os.path.join(optfolder, "usr_pour_point.shp"), ["SHAPE@XY"]):
    x, y = row[0]
outlet_elev = GetCellValue(elevgrid, "{} {}".format(x, y))
outletelev = float(outlet_elev.getOutput(0))
basinrelief = float(mean_elev - outletelev)  # Assuming it is already converted into feets

# *******************************************************************************************************
# Get percent soil types from soil dataset
# *******************************************************************************************************

#*******************************************************************************************************
# Calculate soil percentages using selected soil data for soil percentages
#*******************************************************************************************************

def SoilPct(inSoil):
    pctAsoilR = 0
    pctBsoilR = 0
    pctCsoilR = 0
    pctDsoilR = 0
    pctWsoilR = 0
    temptab = SearchCursor(inSoil,"","","Value;Count","")
    for row in temptab:
        thecount = float(row.getValue("Count"))
        if row.getValue("Value") == 1:
            pctAsoilR = pctAsoilR + thecount
        elif row.getValue("Value") == 2:
            pctBsoilR = pctBsoilR + thecount
        elif row.getValue("Value") == 3:
            pctCsoilR = pctCsoilR + thecount
        elif row.getValue("Value") == 4:
            pctDsoilR = pctDsoilR + thecount
        elif row.getValue("Value") == -1:
            pctWsoilR = pctWsoilR + thecount


    return pctAsoilR, pctBsoilR, pctCsoilR, pctDsoilR, pctWsoilR

pctR = SoilPct(soils_path)
pctSoil = list(map(float, pctR))
pctAR = float(pctSoil[0])
pctAsoilR = float((pctAR / basinarea) * 100)
pctBR = float(pctSoil[1])
pctBsoilR = float((pctBR / basinarea) * 100)
pctCR = float(pctSoil[2])
pctCsoilR = float((pctCR / basinarea) * 100)
pctDR = float(pctSoil[3])
pctDsoilR = float((pctDR / basinarea) * 100)

"""
The following code calculates the Time of Concentration. If multiple provinces
are involved, tc is weighted average of area of watershed in each province.
More correct would be to perform weighted average based on length of channel
in each province.  This modification will be performed at a later time.  (GEM - 12/01/99)
"""

# *******************************************************************************************************
# don"t add "theVTab" to TOC -- it will change list by drawing order to list
# by source which will prohibit addition of new layers
# *******************************************************************************************************
ZonalStatisticsAsTable(prov, "PROVINCE", basingrid, "theVTab", "DATA", "ALL")
DeleteField_management("theVTab", "ZONE_CODE;MIN;MAX;RANGE;MEAN;STD;SUM;VARIETY;MAJORITY;MINORITY;MEDIAN")
addFieldNameList = ["Q1.25", "Q1.50", "Q1.75", "Q2", "Q5", "Q10", "Q25", "Q50", "Q100", "Q200", "Q500"]
for each in addFieldNameList:
    if not len(ListFields("theVTab", each)) > 0:
        AddField_management("theVTab", each, "FLOAT", 10, 3)

# *******************************************************************************************************
sumarea = 0
theVTab = SearchCursor("theVTab", "", "", "Count", "")
for each in theVTab:
    count = each.getValue("Count")
    sumarea = sumarea + count
sumArea = sumarea
del each

# *******************************************************************************************************
# Compute Time of Concentration:
#                               1]  W.O. Thomas, Jr. Equation   [tc]
#                               2]  SCS Lag equation * 1.67     [lagtime]
# *******************************************************************************************************
sumtc = 0
theVTab = SearchCursor("theVTab", "", "", "Province;Count", "")
for row in theVTab:
    theProv = row.getValue("Province")
    theArea = row.getValue("Count")

    if row.getValue("Province") == "A":
        temptc = 0.133 * ((maxlength) ** (0.475)) * ((theslope) ** (-0.187)) * ((101 - FC) ** (-0.144)) * (
                (101 - IA) ** (0.861)) * ((ST + 1) ** (0.154)) * ((10) ** (0.194))
    elif row.getValue("Province") == "W":
        temptc = 0.133 * ((maxlength) ** (0.475)) * ((theslope) ** (-0.187)) * ((101 - FC) ** (-0.144)) * (
                (101 - IA) ** (0.861)) * ((ST + 1) ** (0.154)) * ((10) ** (0.366))
    elif row.getValue("Province") == "E":
        temptc = 0.133 * ((maxlength) ** (0.475)) * ((theslope) ** (-0.187)) * ((101 - FC) ** (-0.144)) * (
                (101 - IA) ** (0.861)) * ((ST + 1) ** (0.154)) * ((10) ** (0.366))
    else:
        temptc = 0.133 * ((maxlength) ** (0.475)) * ((theslope) ** (-0.187)) * ((101 - FC) ** (-0.144)) * (
                (101 - IA) ** (0.861)) * ((ST + 1) ** (0.154))
    sumtc = sumtc + (temptc * theArea)
del row

tc = (sumtc / basinarea)

# *******************************************************************************************************
# Calculate lagtime
# *******************************************************************************************************
landslopegrid = gishydroslope(elevgrid,dirgrid,cellsize,optfolder)
landslopegrid = Times(landslopegrid, basingrid)
landsloperesult = GetRasterProperties_management(landslopegrid, "MEAN")
landslopevalue = float(landsloperesult.getOutput(0))
landslope = float(landslopevalue) / 3.28084  # modified: 09/06/2018 (divided by 3.28084)

lagtime = (float(100 * ((maxlength * 5280) ** (0.8)) * (((1000 / avgCN) - 9) ** (0.7))) / float(1900 * ((abs(landslope) * 100) ** (0.5)))) / 60

# *******************************************************************************************************
# Calculate Mean Annual Precipitation
# *******************************************************************************************************

env.snapRaster = elevgrid
env.cellSize = elevgrid

maprecbasin = Times(mapstpm, basingrid)  # Make sure basingrid has value 1 otherwise all precip will be 0
theprec = Times(prec_grid, basingrid)
precavg = GetRasterProperties_management(maprecbasin, "MEAN")
precavg = float(precavg.getOutput(0))
avgprec = GetRasterProperties_management(theprec, "MEAN")
avgprec = float(avgprec.getOutput(0))
maprec = float(precavg / (1000 * 2.54))
p2yr = float(avgprec / 1000)


# *******************************************************************************************************
# Print out Impervious area warning message
# *** warning message is included in for loop despite the fact that technically it could be printed
#     twice. Since both "Appalachian Plateau" and "Eastern Coastal Plain" are far apart so it is
#     impossible to have that big watershed while doing analysis with GISHydroNXT
# *******************************************************************************************************
html_warning = ""
theVTab = SearchCursor("theVTab", "", "", "Province", "")
for row in theVTab:
    if (row.getValue("Province") == "A") or (row.getValue("Province") == "E"):
        if float(IA) >= 10:
            html_warning = html_warning + Impwarntext + "\n"

# *******************************************************************************************************
# Close to boundary condition for provinces -- Near tool isn"t available with
# basic level license therefore a more crude method was emplyed here. It can
# be improved in future by using "Geometry()" tool to get distance
# *******************************************************************************************************
Buffer_analysis(os.path.join(optfolder, "wshed.shp"), os.path.join(optfolder, "wats_prov.shp"), "5000", "#", "#", "ALL", "FID")
Intersect_analysis([province, os.path.join(optfolder, "wats_prov.shp")], os.path.join(optfolder, "prov_int.shp"))
prov_cursor = SearchCursor(os.path.join(optfolder, "prov_int.shp"), "", "", "FID", "")
prov = prov_cursor.next()
if prov != None:
    html_warning = html_warning + provwarntext + "\n"

# *******************************************************************************************************
# Close to boundary condition for limestone -- Near tool isn"t available with
# basic level license therefore a more crude method was emplyed here. It can
# be improved in future by using "Geometry()" tool to get distance
# *******************************************************************************************************
Buffer_analysis(os.path.join(optfolder, "wshed.shp"), os.path.join(optfolder, "wats_lime.shp"), "1000", "#", "#", "ALL", "FID")
Intersect_analysis([limestonem, wats_lime], lime_int, "ALL", "#", "INPUT")
lime_cursor = SearchCursor(lime_int, "", "", "FID", "")
lime = lime_cursor.next()
if lime != None:
    html_warning = html_warning + limewarntext + "\n"

# *******************************************************************************************************
# Hydraulic coefficients for channel geometry -- default to outlet"s physiographic province
# *******************************************************************************************************
a = [13.87, 14.78, 10.3]
b = [0.44, 0.39, 0.38]
c = [0.95, 1.18, 1.01]
d = [0.31, 0.34, 0.32]
e = [13.17, 17.42, 10.34]
f = [0.75, 0.73, 0.70]

provstring = []

theVTab = SearchCursor("theVTab", "", "", "Province;Count", "")
for row in theVTab:

    AreaField = float(row.getValue("Count"))
    areapercent = float((AreaField / sumArea) * 100)

    if row.getValue("Province") == "A" or row.getValue("Province") == "B":
        Coef_W = a[0]
        Exp_W = b[0]
        Coef_D = c[0]
        Exp_D = d[0]
        Coef_A = e[0]
        Exp_A = f[0]
    elif row.getValue("Province") == "P":
        Coef_W = a[1]
        Exp_W = b[1]
        Coef_D = c[1]
        Exp_D = d[1]
        Coef_A = e[1]
        Exp_A = f[1]
    elif row.getValue("Province") == "W" or row.getValue("Province") == "E":
        Coef_W = a[2]
        Exp_W = b[2]
        Coef_D = c[2]
        Exp_D = d[2]
        Coef_A = e[2]
        Exp_A = f[2]
    if row.getValue("Province") == "A":
        provstring.append(["Appalachian Plateaus and Allegheny Ridges","{0:.2f}".format(areapercent)])
    elif row.getValue("Province") == "B" or row.getValue("Province") == "P":
        provstring.append(["Blue Ridge and Piedmont","{0:.2f}".format(areapercent)])
    elif row.getValue("Province") == "W":
        provstring.append(["Western Coastal Plain","{0:.2f}".format(areapercent)])
    elif row.getValue("Province") == "E":
        provstring.append(["Eastern Coastal Plain","{0:.2f}".format(areapercent)])
    else:
        provstring.append(["No Province Selected","0"])

coef_list = [Coef_W, Coef_D, Coef_A]
exp_list = [Exp_W, Exp_D, Exp_A]

pctsoilR = [round(pctAsoilR,2), round(pctBsoilR,2), round(pctCsoilR,2), round(pctDsoilR,2)]
pctsoil = [round(pctAsoil,2), round(pctBsoil,2), round(pctCsoil,2), round(pctDsoil,2)]

# *******************************************************************************************************
# format precision before text file string settings
# *******************************************************************************************************
maxlength = "{0:.2f}".format(maxlength)
theslope = "{0:.8f}".format(theslope)
theslope_feet = "{0:.8f}".format(theslope_feet)
landslope = "{0:.8f}".format(landslope)
pctAsoil = "{0:.2f}".format(pctAsoil)
pctBsoil = "{0:.2f}".format(pctBsoil)
pctCsoil = "{0:.2f}".format(pctCsoil)
pctDsoil = "{0:.2f}".format(pctDsoil)
pctWsoil = "{0:.2f}".format(pctWsoil)
UrbPct = "{0:.2f}".format(UrbPct)
FC = "{0:.2f}".format(FC)
ST = "{0:.2f}".format(ST)
IA = "{0:.2f}".format(IA)
LI = "{0:.2f}".format(LI)
areami2 = "{0:.2f}".format(areami2)
outletelev = "{0:.2f}".format(outletelev)
basinrelief = "{0:.2f}".format(basinrelief)
avgCN = "{0:.1f}".format(avgCN)
pctAsoilR = "{0:.2f}".format(pctAsoilR)
pctBsoilR = "{0:.2f}".format(pctBsoilR)
pctCsoilR = "{0:.2f}".format(pctCsoilR)
pctDsoilR = "{0:.2f}".format(pctDsoilR)
tc = "{0:.2f}".format(tc)
lagtime = "{0:.2f}".format(lagtime)
maprec = "{0:.2f}".format(maprec)
p2yr = "{0:.2f}".format(p2yr)

#############
## OUTPUTS ##
#############

# Basin comp

SetParameterAsText(set_i, json.dumps(lu_desc)); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(soil_acre_lists)); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(total_area)); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(acres)); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(area_percent)); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(curve_num)); set_i = set_i + 1

# Basins statistics

SetParameterAsText(set_i, html_warning); set_i = set_i + 1
SetParameterAsText(set_i, int(x)); set_i = set_i + 1
SetParameterAsText(set_i, int(y)); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(provstring)); set_i = set_i + 1
SetParameterAsText(set_i, areami2); set_i = set_i + 1
SetParameterAsText(set_i, theslope); set_i = set_i + 1
SetParameterAsText(set_i, theslope_feet); set_i = set_i + 1
SetParameterAsText(set_i, landslope); set_i = set_i + 1
SetParameterAsText(set_i, UrbPct); set_i = set_i + 1
SetParameterAsText(set_i, IA); set_i = set_i + 1
SetParameterAsText(set_i, tc); set_i = set_i + 1
SetParameterAsText(set_i, lagtime); set_i = set_i + 1
SetParameterAsText(set_i, maxlength); set_i = set_i + 1
SetParameterAsText(set_i, outletelev); set_i = set_i + 1
SetParameterAsText(set_i, basinrelief); set_i = set_i + 1
SetParameterAsText(set_i, avgCN); set_i = set_i + 1
SetParameterAsText(set_i, FC); set_i = set_i + 1
SetParameterAsText(set_i, ST); set_i = set_i + 1
SetParameterAsText(set_i, LI); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(pctsoilR)); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(pctsoil)); set_i = set_i + 1
SetParameterAsText(set_i, p2yr); set_i = set_i + 1
SetParameterAsText(set_i, maprec); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(coef_list)); set_i = set_i + 1
SetParameterAsText(set_i, json.dumps(exp_list)); set_i = set_i + 1

try:

    Delete_management(os.path.join(optfolder, "lu_poly.shp"))
    Delete_management(os.path.join(optfolder, "lu_soil.shp"))
    Delete_management(os.path.join(optfolder, "lu_soil_diss.shp"))
    Delete_management(os.path.join(optfolder, "soil_poly.shp"))

    Delete_management(os.path.join(optfolder, "dir_shift_1.tif"))
    Delete_management(os.path.join(optfolder, "dir_shift_2.tif"))
    Delete_management(os.path.join(optfolder, "dir_shift_4.tif"))
    Delete_management(os.path.join(optfolder, "dir_shift_8.tif"))
    Delete_management(os.path.join(optfolder, "dir_shift_16.tif"))
    Delete_management(os.path.join(optfolder, "dir_shift_32.tif"))
    Delete_management(os.path.join(optfolder, "dir_shift_64.tif"))
    Delete_management(os.path.join(optfolder, "dir_shift_128.tif"))
    Delete_management(os.path.join(optfolder, "lime_int.shp"))
    Delete_management(os.path.join(optfolder, "prov_int.shp"))
    Delete_management(os.path.join(optfolder, "wats_lime.shp"))
    Delete_management(os.path.join(optfolder, "wats_prov.shp"))
    Delete_management(os.path.join(optfolder, "gauge_outlet.shp"))
except:
    pass

