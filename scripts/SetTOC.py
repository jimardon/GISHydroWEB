# -*- #################
"""
Modified 02/2021

@author: Javier.Mardones
"""

from arcpy import (GetParameterAsText,
                   env,
                   SearchCursor,
                   ListFields,
                   AddField_management,
                   CalculateField_management,
                   UpdateCursor,
                   PolylineToRaster_conversion,
                   RasterToPolygon_conversion,
                   Dissolve_management,
                   Intersect_analysis,
                   Describe,
                   MakeFeatureLayer_management,
                   Clip_management,
                   GetRasterProperties_management,
                   GetCount_management,
                   BuildRasterAttributeTable_management,
                   CopyRaster_management,
                   RasterToPoint_conversion,
                   RasterToPolyline_conversion,
                   Delete_management,
                   Project_management,
                   SpatialReference,
                   SetParameterAsText)
from arcpy.sa import (ZonalStatisticsAsTable,
                      FlowLength,
                      Minus,
                      IsNull,
                      Divide,
                      Plus,
                      Times,
                      Reclassify,
                      RemapValue,
                      Con,
                      SetNull,
                      Log2,
                      StreamLink,
                      Int,
                      ExtractMultiValuesToPoints)
from arcpy.da import SearchCursor as SearchCursorda

import os
from itertools import groupby
from operator import itemgetter
import json

set_i = 0
projectname = GetParameterAsText(set_i); set_i = set_i + 1
landuse = GetParameterAsText(set_i); set_i = set_i + 1
Tc_method = GetParameterAsText(set_i); set_i = set_i + 1
Tc_ns = GetParameterAsText(set_i); set_i = set_i + 1
Tc_P = GetParameterAsText(set_i); set_i = set_i + 1
Tc_L = GetParameterAsText(set_i); set_i = set_i + 1
Tc_paved = GetParameterAsText(set_i) == "true"; set_i = set_i + 1
Tc_sa = GetParameterAsText(set_i); set_i = set_i + 1
Tc_nc = GetParameterAsText(set_i); set_i = set_i + 1
Tc_cwCoef = GetParameterAsText(set_i); set_i = set_i + 1
Tc_cwExp = GetParameterAsText(set_i); set_i = set_i + 1
Tc_cdCoef = GetParameterAsText(set_i); set_i = set_i + 1
Tc_cdExp = GetParameterAsText(set_i); set_i = set_i + 1
Tc_caCoef = GetParameterAsText(set_i); set_i = set_i + 1
Tc_caExp = GetParameterAsText(set_i); set_i = set_i + 1
lfp_correction = GetParameterAsText(set_i); set_i = set_i + 1

#get path from environment variable
directory = r"" + str(os.environ['GISHydro_DIR'])

directorygdb = os.path.join(directory, "data","gishydro.gdb")

optfolder = os.path.join(directory, "projects", projectname)

env.overwriteOutput = True
env.scratchWorkspace = optfolder
env.workspace = optfolder
env.snapRaster = os.path.join(optfolder, "dem_clip.tif")

# *******************************************************************************************************
# Hydraulic coefficients for channel geometry -- default to outlet"s physiographic province
# *******************************************************************************************************
a = [13.87, 14.78, 10.3]
b = [0.44, 0.39, 0.38]
c = [0.95, 1.18, 1.01]
d = [0.31, 0.34, 0.32]
e = [13.17, 17.42, 10.34]
f = [0.75, 0.73, 0.70]

# *******************************************************************************************************
# input data needed
# *******************************************************************************************************
mdprov = os.path.join(directorygdb, "Mdprov")
basingrid = os.path.join(optfolder, "basingrid.tif")
dem = Times(os.path.join(optfolder, "dem_clip.tif"),basingrid)
subrivers = os.path.join(optfolder, "subrivers.shp")
slope_stats = os.path.join(optfolder, "slope_stats.dbf")
polyras = os.path.join(optfolder, "polyras.tif")
elevzones = os.path.join(optfolder, "elevzones.shp")
elevmerge = os.path.join(optfolder, "elevmerge.shp")
flowdir = os.path.join(optfolder, "flowdir.tif")
flowacc = os.path.join(optfolder, "flowacc.tif")
subsheds = os.path.join(optfolder, "subsheds.tif")
outlets = os.path.join(optfolder, "outlets.tif")
slope_sheds = os.path.join(optfolder, "slope_sheds.dbf")
slopegrid = os.path.join(optfolder, "landslope.tif")
lu = os.path.join(optfolder, "landuse.tif")
subshed_poly = os.path.join(optfolder, "subshed.shp")
cngrid = os.path.join(optfolder, "curvenumber.tif")
cntable = os.path.join(optfolder, "cntable.dbf")
subshed_prov = os.path.join(optfolder, "subshed_prov.shp")
fcp = os.path.join(optfolder, "pntvel.shp")


# *******************************************************************************************************
# add length, and slope fields. Update "slope" field
# "subrivers.shp" attributes calculation
# *******************************************************************************************************
if not len(ListFields(subrivers, "Length")) > 0:
    AddField_management(subrivers, "Length", "FLOAT", 15, 4)
if not len(ListFields(subrivers, "Slope")) > 0:
    AddField_management(subrivers, "Slope", "Double", 15, 9)  # 08/05/2013: "Float" to "Double" and field scale from 4 to 9
CalculateField_management(subrivers, "Length", "!shape.length@feet!", "PYTHON")  # length converted into feet
PolylineToRaster_conversion(subrivers, "ARCID", polyras, "MAXIMUM_LENGTH", "NONE", dem)
RasterToPolygon_conversion(polyras, elevzones, "NO_SIMPLIFY", "Value")
Dissolve_management(elevzones, elevmerge, "GRIDCODE")  # 08/05/2013: added to handle multiple polygons
ZonalStatisticsAsTable(elevmerge, "FID", dem, slope_stats, "DATA", "ALL")  # NODATA is changed to DATA # 08/05/2013: elevzones changed to elevmerge

zonalcur = SearchCursor(slope_stats, "", "", "MIN;MAX", "")
lencursor = SearchCursor(subrivers, "", "", "Length", "")

minlst = []
maxlst = []
lenlst = []

for z in zonalcur:
    min_elev = (z.getValue("MIN"))  # removed multiplication factor of 3.2808 because
    max_elev = (z.getValue("MAX"))  # elevation units are already in feets
    minlst.append(min_elev)
    maxlst.append(max_elev)

for l in lencursor:
    len_cur = l.getValue("Length")
    lenlst.append(len_cur)

diff = [maxlstd - minlstd for maxlstd, minlstd in zip(maxlst, minlst)]
slopeval = [diffd / lenlstd for diffd, lenlstd in zip(diff, lenlst)]

no_subwatersheds = len(slopeval)

# slope values should at least be 0.0001
for index, item in enumerate(slopeval):
    if item == "0":
        slopeval[index] = "0.0001"

count = 0
slopecur = UpdateCursor(subrivers)
for s in slopecur:
    val = slopeval[count]
    s.Slope = round(val,4)
    slopecur.updateRow(s)
    count = count + 1

# update "GRID_CODE" using "FROM_NODE" attribute values
nodes = UpdateCursor(subrivers)
for node in nodes:
    node.setValue("GRID_CODE", node.getValue("FROM_NODE"))
    nodes.updateRow(node)

del node
del nodes

# *******************************************************************************************************
# Fields added:
#               1] length
#               2] slope
#               3] Tc method
#               4] Area in square miles
#               5] CN
#
# Update "slope" field "subsheds.shp" attributes calculation
# *******************************************************************************************************
desc = Describe(subshed_poly)
rows = SearchCursor(subshed_poly)
faccdesc = Describe(flowdir)
cellSize = faccdesc.meanCellHeight
lfp_list = []
for idx, row in enumerate(rows):

    aPoly = row.getValue(desc.shapefieldname)
    setExtent = aPoly.extent

    # create mask raster for each sub-basin
    MakeFeatureLayer_management(subshed_poly, "cliplayer", "FID = " + str(idx))
    CopyRaster_management(os.path.join(optfolder, "mask" + str(idx) + ".tif"), os.path.join(optfolder, "mask_temp" + str(idx) + ".tif"))
    mask = Clip_management(basingrid, "#", os.path.join(optfolder, "mask_temp" + str(idx) + ".tif"), "cliplayer", "", "ClippingGeometry")

    ### VEL METH *FORTRAN* CODE (2018/8/15)
    flowdir_sub = Times(flowdir, mask)
    usflowlength = FlowLength(flowdir_sub, "UPSTREAM", "")
    dsflowlength = FlowLength(flowdir_sub, "DOWNSTREAM", "")
    longestpath = Plus(usflowlength, dsflowlength)
    MaxValR = GetRasterProperties_management(longestpath, "MAXIMUM")
    lfp_list.append(float(MaxValR.getOutput(0)) * 3.28084)
    
    Delete_management(os.path.join(optfolder, "mask_temp" + str(idx) + ".tif"))

# zonal statistics for and "slope_sheds"
slopegrid = Divide(slopegrid, 3.28084)  # 09-07-2018: Landslope value should be factored into meters unit
ZonalStatisticsAsTable(subsheds, "VALUE", slopegrid, slope_sheds, "DATA", "ALL")  # 07-25-2013: "NODATA" was changed to "DATA"

# calculate area in square miles

if not len(ListFields(subshed_poly, "AreaMi2")) > 0:
    AddField_management(subshed_poly, "AreaMi2", "FLOAT", 4, 2)
CalculateField_management(subshed_poly, "AreaMi2", "!shape.area@squaremiles!", "PYTHON")

# update TcMethod
if not len(ListFields(subshed_poly, "TcMethod")) > 0:
    AddField_management(subshed_poly, "TcMethod", "TEXT", 15, 2)
subpoly = UpdateCursor(subshed_poly)
tc_name_lst = [Tc_method]
tc_n_list = tc_name_lst * no_subwatersheds
tc_index = 0

for tc in subpoly:
    Method = tc_n_list[tc_index]
    tc.TcMethod = Method
    subpoly.updateRow(tc)
    tc_index = tc_index + 1

# update CN
ZonalStatisticsAsTable(subsheds, "VALUE", cngrid, cntable, "DATA", "ALL")

cn_mean = SearchCursor(cntable, "", "", "MEAN", "")

cn_list = []
for cn in cn_mean:
    mean_cn = cn.getValue("MEAN")
    cn_list.append(round(float(mean_cn),1))

cn_lst = 0
if not len(ListFields(subshed_poly, "CurveNum")) > 0:
    AddField_management(subshed_poly, "CurveNum", "FLOAT", 15, 2)
cn_update = UpdateCursor(subshed_poly)
for cnum in cn_update:
    sheds_cn = cn_list[cn_lst]
    cnum.CurveNum = round(sheds_cn,1)
    cn_update.updateRow(cnum)
    cn_lst = cn_lst + 1

# update slope -- get mean values from "slope_sheds", add field in "subshed_poly", and update it
slope_mean = SearchCursor(slope_sheds, "", "", "MEAN", "")

slope_list = []
for slp in slope_mean:
    mean_slope = slp.getValue("MEAN")
    slope_list.append(mean_slope)

# adjust units to "feet/feet"
slope_list = [i for i in slope_list]

# create a list holding subshed (raster) count fields
subarea = []
rows = SearchCursor(subsheds, "", "", "Count", "")
for row in rows:
    thecount = row.getValue("Count")
    subarea.append(thecount)

# create a list holding subshed (raster) count fields
subareami = []
rows = SearchCursor(subshed_poly, "", "", "AreaMi2", "")
for row in rows:
    thearea = row.getValue("AreaMi2")
    subareami.append(round(thearea,2))
# *******************************************************************************************************
# calculate Tc at the end as we need Slope, CN for its computation
# *******************************************************************************************************

Pixel = []
Type = []
Mixed = []
Drain_Area = []
Elev = []
Slope = []
AvgArea = []
Width = []
Depth = []
Xarea = []
I_Length = []
Tot_Length = []
Vel = []
I_Time = []
Tot_Time = []

# SCS method
if Tc_method == "SCS Lag Formula":

    slp_lst = 0
    if not len(ListFields(subshed_poly, "Slope")) > 0:
        AddField_management(subshed_poly, "Slope", "FLOAT", "#", "#")
    slope_update = UpdateCursor(subshed_poly)
    for slope in slope_update:
        sheds_slope = slope_list[slp_lst]
        slope.Slope = round(sheds_slope,4)
        slope_update.updateRow(slope)
        slp_lst = slp_lst + 1

    tc_list = []
    for a, b, c in zip(lfp_list, cn_list, slope_list):
        tc_val =  (float(100 * ((a               ) ** (0.8)) * (((1000 / b    ) - 9) ** (0.7))) / float(1900 * ((abs(c) * 100 ) ** (0.5)))) / 60
        tc_list.append(round(tc_val,2))

    tc_lst = 0
    if not len(ListFields(subshed_poly, "Tc")) > 0:
        AddField_management(subshed_poly, "Tc", "FLOAT", 15, 4)
    tc_update = UpdateCursor(subshed_poly)
    for tc in tc_update:
        sheds_tc = tc_list[tc_lst]
        tc.Tc = sheds_tc
        tc_update.updateRow(tc)
        tc_lst = tc_lst + 1

    SetParameterAsText(set_i, json.dumps(Pixel)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Type)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Mixed)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Elev)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Slope)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(subareami)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Width)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Depth)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Xarea)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Tot_Length)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Vel)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(I_Time)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(tc_list)); set_i = set_i + 1


# Hydrology Panel Method
elif Tc_method == "Hydrology Panel":

    # get "gc_lst" before extent definition to avoid intersection for only sub-basin
    Intersect_analysis([mdprov, subshed_poly], subshed_prov, "ALL", "#", "INPUT")
    if not len(ListFields(subshed_poly, "Area")) > 0:
        AddField_management(subshed_prov, "Area", "FLOAT", 15, 4)
    CalculateField_management(subshed_prov, "Area", "!shape.area@squaremeters!", "PYTHON")

    # clip and save sub-sheds 10% bigger than the original extent
    desc = Describe(subshed_poly)
    rows = SearchCursor(subshed_poly)
    FC = []
    ST = []
    IA = []
    lst = 0
    for idx, row in enumerate(rows):
        aPoly = row.getValue(desc.shapefieldname)
        setExtent = aPoly.extent
        expPercent = 0.1

        faccdesc = Describe(flowacc)

        # create mask raster for each sub-basin [04-18-2014: Legacy does same masking and only allow calculations for sub-basin extent]
        MakeFeatureLayer_management(subshed_poly, os.path.join(optfolder, "layer" + str(idx)), ' "FID" = ' + str(idx))
        mask = Clip_management(basingrid, "#", "#", os.path.join(optfolder, "layer" + str(idx)), "0", "ClippingGeometry")

        # clip and save sub-sheds 10% bigger than the original extent
        Tc_temp = Clip_management(lu, "#", "#", "#", "#", "NONE")
        Tc_sub = Times(Tc_temp, mask)
        inLU = os.path.join(optfolder, "Tc_subshed" + str(idx) + ".tif")
        Tc_sub.save(inLU)

        #*******************************************************************************************************
        # Get FC for subwatersheds based on landuse data type
        #*******************************************************************************************************
        rows = SearchCursor(inLU,"","","Value;Count","")
        FCcnt = 0
        for row in rows:
            if (row.getValue("Value") >= 40) & (row.getValue("Value") < 44):
                thecount = row.getValue("Count")
                FCcnt = FCcnt + thecount

        if landuse == "MRLC":
            STcnt = 0
            for row in rows:
                if (row.getValue("Value") == 11) or (row.getValue("Value") == 91) or (row.getValue("Value") == 92):
                    thecount = row.getValue("Count")
                    STcnt = STcnt + thecount
        else:
            STcnt = 0
            for row in rows:
                if (row.getValue("Value") >= 50) & (row.getValue("Value") <= 62):
                    thecount = row.getValue("Count")
                    STcnt = STcnt + thecount

        if landuse == "MRLC":
            LU = Reclassify(inLU,"Value", RemapValue([[21,25],[22,65],[23,82],[31,100], [32,11],[33,50],[85,11]]))
            rows = SearchCursor(LU,"","","Value;Count","")
            for row in rows:
                Impcnt = float(row.getValue("Count"))
        elif landuse == "Ultimate":
            LU = Reclassify(inLU,"Value",
                                     RemapValue([[11,25],[12,30],[13,65],[14,82],
                                                 [15,70],[16,50],[17,11],[18,11],
                                                 [70,50],[72,10],[73,50],[80,1],[191,15],
                                                 [192,15],[241,10],[242,10],[111,65],
                                                 [112,38],[113,30],[114,25],[115,2],[116,12]]))
            rows = SearchCursor(LU,"","","Value;Count","")
            for row in rows:
                Impcnt = float(row.getValue("Count"))
        elif landuse == "1997 USGS" or landuse == "1970s USGS":
            LU = Reclassify(inLU,"Value",
                                     RemapValue([[11,30],[12,82],[13,70],[14,100],
                                                 [15,76],[16,11],[17,11],[70,0.50],
                                                 [71,100],[74,100],[75,11],[76,50],[77,50]]),)
            rows = SearchCursor(LU,"","","Value;Count","")
            for row in rows:
                Impcnt = float(row.getValue("Count"))
        else:
            LU = Reclassify(inLU,"Value",
                                     RemapValue([[11,25],[12,30],[13,65],[14,82],
                                                 [15,70],[16,50],[17,11],[18,11],
                                                 [70,50],[72,100],[73,50],[80,100],[191,15],
                                                 [192,15],[241,10],[242,10]]))
            rows = SearchCursor(LU,"","","Value;Count","")
            for row in rows:
                Impcnt = float(row.getValue("Count"))

        FC.append(FCcnt)
        ST.append(STcnt)
        IA.append(Impcnt)
        lst = lst + 1

    # compute percent area of FC, ST, and IA in each subwatershed
    FC = [(float(a) / b) * 100 for a, b in zip(FC, subarea)]
    ST = [(float(a) / b) * 100 for a, b in zip(ST, subarea)]
    IA = [(float(a) / b) * 100 for a, b in zip(IA, subarea)]

    # create lists to store gridcode (for duplication of FC, ST, IA, maxlength, and theslope), province, and area
    gc_lst = []
    prov_lst = []
    area_lst = []
    sub_prov = SearchCursor(subshed_prov, "", "", "GRIDCODE;PROVINCE;Area", "")
    for sub in sub_prov:
        gc = sub.getValue("GRIDCODE")
        gc_lst.append(gc)
        prov = sub.getValue("PROVINCE")
        prov_lst.append(prov)
        area = sub.getValue("Area")
        area_lst.append(area / 900)  # list with subshed area percent in different provinces

    del sub_prov

    slp_lst = 0
    if not len(ListFields(subshed_poly, "Slope")) > 0:
        AddField_management(subshed_poly, "Slope", "FLOAT", "#", "#")
    slope_update = UpdateCursor(subshed_poly)
    for slope in slope_update:
        sheds_slope = slope_list[slp_lst]
        slope.Slope = round(sheds_slope,4)
        slope_update.updateRow(slope)
        slp_lst = slp_lst + 1

    # adjustment to longest flow path and slope for Tc calculation
    maxlength = [float(x) / 5280 for x in lfp_list]  # maxlength = [float(x)/5280 for x in length]
    theslope = [x * 5280 for x in slope_list]  # theslope = [x*5280 for x in slope]

    # update lists to match intersect subshed with poly (for average weighting of Tc)
    FC_updated = []
    ST_updated = []
    IA_updated = []
    maxlength_updated = []
    theslope_updated = []
    tmp_tc = []
    for i, g in enumerate(groupby(gc_lst)):
        FC_updated += [FC[i]] * len(list(g[1]))

    for i, g in enumerate(groupby(gc_lst)):
        ST_updated += [ST[i]] * len(list(g[1]))

    for i, g in enumerate(groupby(gc_lst)):
        IA_updated += [IA[i]] * len(list(g[1]))

    for i, g in enumerate(groupby(gc_lst)):
        maxlength_updated += [maxlength[i]] * len(list(g[1]))

    for i, g in enumerate(groupby(gc_lst)):
        theslope_updated += [theslope[i]] * len(list(g[1]))

    # looping over lists to compute "temptc" -- make sure that all lists are of equal length
    for a, b, c, d, e, f, g in zip(prov_lst, maxlength_updated, theslope_updated, FC_updated, IA_updated,
                                   ST_updated, area_lst):
        if a == "A":
            temptc = (0.133 * (b ** (0.475)) * (c ** (-0.187)) * ((101 - d) ** (-0.144)) * (
                    (101 - e) ** (0.861)) * ((f + 1) ** (0.154)) * ((10) ** (0.194)))
        elif a == "W":
            temptc = (0.133 * (b ** (0.475)) * (c ** (-0.187)) * ((101 - d) ** (-0.144)) * (
                    (101 - e) ** (0.861)) * ((f + 1) ** (0.154)) * ((10) ** (0.366)))
        elif a == "E":
            temptc = (0.133 * (b ** (0.475)) * (c ** (-0.187)) * ((101 - d) ** (-0.144)) * (
                    (101 - e) ** (0.861)) * ((f + 1) ** (0.154)) * ((10) ** (0.366)))
        else:
            temptc = (0.133 * (b ** (0.475)) * (c ** (-0.187)) * ((101 - d) ** (-0.144)) * (
                    (101 - e) ** (0.861)) * ((f + 1) ** (0.154)))
        tmp_tc.append(g * temptc)

    tc = []
    for num, grp in groupby(enumerate(gc_lst), itemgetter(1)):
        tmp_list = [tmp_tc[idx] for idx, _ in grp]
        tc.append(sum(tmp_list))

    tc_list = [round(a / b,2) for a, b in zip(tc, subarea)]

    tc_lst = 0
    if not len(ListFields(subshed_poly, "Tc")) > 0:
        AddField_management(subshed_poly, "Tc", "FLOAT", 15, 2)
    tc_update = UpdateCursor(subshed_poly)
    for tc in tc_update:
        sheds_tc = tc_list[tc_lst]
        tc.Tc = sheds_tc
        tc_update.updateRow(tc)
        tc_lst = tc_lst + 1

    SetParameterAsText(set_i, json.dumps(Pixel)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Type)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Mixed)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Elev)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Slope)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(subareami)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Width)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Depth)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Xarea)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Tot_Length)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Vel)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(I_Time)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(tc_list)); set_i = set_i + 1


# Velocity Method
else:
    # LongPathSub"s schema is locked once added to data frame and "Reset" button fails due to this reason
    # If we don"t add LongPathSub to current data frame then we can remove "vel_meth" folder without any error

    # *******************************************************************************************************
    # Add fields to "subshed.shp" for subsequent processing during segment merge
    # *******************************************************************************************************
    try:
        AddField_management(subshed_poly, "sheet_n", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "sheet_P", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "sheet_L", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "shal_Paved", "TEXT", 15, 4)
        AddField_management(subshed_poly, "channel_n", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "ChanDef", "TEXT", 15, 4)
        AddField_management(subshed_poly, "ChanSA", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "WidthCoef", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "WidthExp", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "DepthCoef", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "DepthExp", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "XAreaCoef", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "XAreaExp", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "LngFlwPth", "FLOAT", 15, 4)
        AddField_management(subshed_poly, "Slope", "FLOAT", "#", "#")
        AddField_management(subshed_poly, "Tc", "FLOAT", 15, 4)
    except:
        pass

    # add "n_sheet"
    sheet_n_lst = []
    sheet_n_lst.append(Tc_ns)
    sheet_n_lst = sheet_n_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for n_sheet in subpoly:
        relay = sheet_n_lst[index]
        n_sheet.sheet_n = relay
        subpoly.updateRow(n_sheet)
        index = index + 1

    # add "P_sheet"
    sheet_P_lst = []
    sheet_P_lst.append(Tc_P)
    sheet_P_lst = sheet_P_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for P_sheet in subpoly:
        relay = sheet_P_lst[index]
        P_sheet.sheet_P = relay
        subpoly.updateRow(P_sheet)
        index = index + 1

    # add "L_sheet"
    sheet_L_lst = []
    sheet_L_lst.append(Tc_L)
    sheet_L_lst = sheet_L_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for L_sheet in subpoly:
        relay = sheet_L_lst[index]
        L_sheet.sheet_L = relay
        subpoly.updateRow(L_sheet)
        index = index + 1

    # add "Paved or Unpaved"
    shallow_Paved_lst = []
    if Tc_paved:
        shallow_Paved_lst.append("Paved")
        shallow_Paved_lst = shallow_Paved_lst * no_subwatersheds
    else:
        shallow_Paved_lst.append("Unpaved")
        shallow_Paved_lst = shallow_Paved_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for Paved in subpoly:
        relay = shallow_Paved_lst[index]
        Paved.shal_Paved = relay
        subpoly.updateRow(Paved)
        index = index + 1

    # use "NHD" or modified streams
    ChanDef_lst = []
    ChanDef_lst.append("SourceArea")
    ChanDef_lst = ChanDef_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for Def_Chan in subpoly:
        relay = ChanDef_lst[index]
        Def_Chan.ChanDef = relay
        subpoly.updateRow(Def_Chan)
        index = index + 1

    # add "n_channel"
    channel_n_lst = []
    channel_n_lst.append(Tc_nc)
    channel_n_lst = channel_n_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for n_channel in subpoly:
        relay = channel_n_lst[index]
        n_channel.channel_n = relay
        subpoly.updateRow(n_channel)
        index = index + 1

    # add "SA_sheet"
    ChanSA_lst = []
    ChanSA_lst.append(Tc_sa)
    ChanSA_lst = ChanSA_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for SA_Chan in subpoly:
        relay = ChanSA_lst[index]
        SA_Chan.ChanSA = relay
        subpoly.updateRow(SA_Chan)
        index = index + 1

    # add "cw_coef"
    WidthCoef_lst = []
    WidthCoef_lst.append(Tc_cwCoef)
    WidthCoef_lst = WidthCoef_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for cw_coef in subpoly:
        relay = WidthCoef_lst[index]
        cw_coef.WidthCoef = relay
        subpoly.updateRow(cw_coef)
        index = index + 1

    # add "cw_exp"
    WidthExp_lst = []
    WidthExp_lst.append(Tc_cwExp)
    WidthExp_lst = WidthExp_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for cw_exp in subpoly:
        relay = WidthExp_lst[index]
        cw_exp.WidthExp = relay
        subpoly.updateRow(cw_exp)
        index = index + 1

    # add "cd_coef"
    DepthCoef_lst = []
    DepthCoef_lst.append(Tc_cdCoef)
    DepthCoef_lst = DepthCoef_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for cd_coef in subpoly:
        relay = DepthCoef_lst[index]
        cd_coef.DepthCoef = relay
        subpoly.updateRow(cd_coef)
        index = index + 1

    # add "cd_exp"
    DepthExp_lst = []
    DepthExp_lst.append(Tc_cdExp)
    DepthExp_lst = DepthExp_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for cd_exp in subpoly:
        relay = DepthExp_lst[index]
        cd_exp.DepthExp = relay
        subpoly.updateRow(cd_exp)
        index = index + 1

    # add "ca_coef"
    XAreaCoef_lst = []
    XAreaCoef_lst.append(Tc_caCoef)
    XAreaCoef_lst = XAreaCoef_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for ca_coef in subpoly:
        relay = XAreaCoef_lst[index]
        ca_coef.XAreaCoef = relay
        subpoly.updateRow(ca_coef)
        index = index + 1

    # add "ca_exp"
    XAreaExp_lst = []
    XAreaExp_lst.append(Tc_caExp)
    XAreaExp_lst = XAreaExp_lst * no_subwatersheds
    subpoly = UpdateCursor(subshed_poly)
    index = 0
    for ca_exp in subpoly:
        relay = XAreaExp_lst[index]
        ca_exp.XAreaExp = relay
        subpoly.updateRow(ca_exp)
        index = index + 1

    slope_mean = SearchCursor(slope_sheds, "", "", "MEAN", "")
    slope_list = []
    for slp in slope_mean:
        mean_slope = slp.getValue("MEAN")
        slope_list.append(mean_slope)

    slp_lst = 0
    slope_update = UpdateCursor(subshed_poly)
    for slope in slope_update:
        sheds_slope = slope_list[slp_lst]
        slope.Slope = round(sheds_slope,4)
        slope_update.updateRow(slope)
        slp_lst = slp_lst + 1

    # read sheet global variables [some variables are re-defines just to keep consistency with Avenue code]
    sheet_n = float(Tc_ns)
    sheet_P = float(Tc_P)
    sheet_L = float(Tc_L)

    # read channel global variables
    chan_n = float(Tc_nc)
    thechanSA = float(Tc_sa)
    widthcoef = float(Tc_cwCoef)
    widthexp = float(Tc_cwExp)
    depthcoef = float(Tc_cdCoef)
    depthexp = float(Tc_cdExp)
    xareacoef = float(Tc_caCoef)
    xareaexp = float(Tc_caExp)
    lfpcorr = float(lfp_correction)

    desc = Describe(subshed_poly)
    rows = SearchCursor(subshed_poly)

    # begin indexing and process data for each sub-basin
    tc_list = []
    for idx, row in enumerate(rows):

        aPoly = row.getValue(desc.shapefieldname)
        setExtent = aPoly.extent
        expPercent = 0.1

        faccdesc = Describe(flowacc)
        cellSize = faccdesc.meanCellHeight

        # create mask raster for each sub-basin
        MakeFeatureLayer_management(subshed_poly, "cliplayer", "FID = " + str(idx))
        CopyRaster_management(os.path.join(optfolder, "mask" + str(idx) + ".tif"), os.path.join(optfolder, "mask_temp" + str(idx) + ".tif"))
        mask = Clip_management(basingrid, "#", os.path.join(optfolder, "mask_temp" + str(idx)) + ".tif", "cliplayer", "", "ClippingGeometry")
        # clip and save sub-sheds 10% bigger than the original extent

        facc = Plus(flowacc, 1)

        srcpixel = thechanSA / pow(cellSize, 2) /0.000247
        streamgrid_con = Con(facc >= srcpixel, 1, 0)
        InfStr_null = SetNull(streamgrid_con, streamgrid_con, "Value = 0")
        InfStr_min = Minus(InfStr_null, 1)
        streamgrid_masked = Times(InfStr_min, mask)
        streamgrid_masked.save(os.path.join(optfolder, "streamgrid" + str(idx) + ".tif"))

        # get upstream and log2 base direction raster for sub-extents
        upgrid = FlowLength(flowdir, "UPSTREAM", "")
        upgrid = Times(upgrid, 3.28084)
        upgrid = Times(upgrid, mask)
        dlgrid_temp1 = Log2(flowdir)
        dlgrid_temp2 = dlgrid_temp1 % 2
        dlgrid_temp3 = Con(dlgrid_temp2 > 0, pow(2, 0.5), 1)
        dlgrid_temp4 = Times(dlgrid_temp3, cellSize)
        dlgrid = Times(dlgrid_temp4, 3.28084)
        dlgrid = Times(dlgrid, mask)
        upgridp = upgrid + dlgrid

        # calculate indicator grid ("indic = 3" means everything is swale)
        indic = Times(basingrid, 3)  # create swale raster
        indic = Con(upgridp <= sheet_L, 1, indic)  # substitute sheet flow
        indic = Con((upgridp > sheet_L) & (upgrid < sheet_L), 2, indic)  # substitute pixels that are part sheet, part swale
        channel_con = IsNull(os.path.join(optfolder, "streamgrid" + str(idx) + ".tif"))
        indic = Con(channel_con == 0, 4, indic)  # substitute channel pixels
        indic = Times(indic, mask)

        # calculate Swale part of travel time
        if Tc_paved:
            swale_coef = 73181.52  # revised from 73440 based on 3600 times the value in Appendix F of TR-55 Manual
        else:
            swale_coef = 58084.20  # revised from 57600 based on 3600 times the value in Appendix F of TR-55 Manual

        ### VEL METH *FORTRAN* CODE (2018/8/15)
        flowdir_sub = Times(flowdir, mask)
        usflowlength = FlowLength(flowdir_sub, "UPSTREAM", "")
        dsflowlength = FlowLength(flowdir_sub, "DOWNSTREAM", "")
        longestpath = Plus(usflowlength, dsflowlength)
        MaxValR = GetRasterProperties_management(longestpath, "MAXIMUM")
        MaxVal = float(MaxValR.getOutput(0))
        longestpath = SetNull(longestpath, longestpath, "Value < " + str(MaxVal - cellSize / 10))
        longestpath = Divide(longestpath, longestpath)
        strlnk = StreamLink(longestpath, flowdir)
        streams_no = GetCount_management(strlnk)
        streams_no = int(streams_no.getOutput(0))
        while streams_no > 2:
            attributes = SearchCursor(strlnk)
            values = []
            valsort = []
            for i in attributes:
                values.append(i.getValue("Count"))
                valsort.append(i.getValue("Count"))
            valsort.sort()
            strrepeat = 0
            for i in range(len(valsort) - 1):
                if valsort[i] == valsort[i + 1]:
                    strrepeat = valsort[i]
            if strrepeat > 0:
                index = values.index(strrepeat)
            else:
                index = values.index(min(values))
            longestpath = SetNull(strlnk, 1, "Value = " + str(index + 1))
            strlnk = StreamLink(longestpath, flowdir)
            BuildRasterAttributeTable_management(strlnk)
            streams_no = GetCount_management(strlnk)
            streams_no = int(streams_no.getOutput(0))
        longestpath = Times(longestpath, indic)
        CopyRaster_management(longestpath, os.path.join(optfolder, "LongPathSub" + str(idx) + ".tif"), "", "", "", "",
                                    "", "8_BIT_SIGNED")
        BuildRasterAttributeTable_management(os.path.join(optfolder, "LongPathSub" + str(idx) + ".tif"))
        RasterToPoint_conversion(longestpath, fcp, "VALUE")

        # Must do the following to solve for floating points math issue (multiply by 1e6 and then divide by 1e6)
        elevgrid1 = Int(dem)
        elevgrid2 = Minus(dem, elevgrid1)
        elevgrid2 = Times(elevgrid2, 1e6)

        ExtractMultiValuesToPoints(fcp, [[slopegrid, "Slope"], [elevgrid1, "Elev1"], [elevgrid2, "Elev2"],
                                             [facc, "Acc"], [indic, "Type"], [dlgrid, "dL"]], "NONE")
        rawlist = []
        fields = ['Slope', 'Elev1', 'Elev2', 'Acc', 'Type', 'dL']
        with SearchCursorda(fcp, fields) as cursor:
            for rw in cursor:
                rawlist.append(rw)

        sorted_list = sorted(rawlist, key=itemgetter(3))
        prePixel = list(range(1, len(sorted_list) + 1))
        preSlope = [item[0]/lfpcorr for item in sorted_list]
        Elev1 = [item[1] for item in sorted_list]
        Elev2 = [item[2] / 1e6 for item in sorted_list]
        preElev = [x + y for x, y in zip(Elev1, Elev2)]  # concatenate two from the elev list
        preDrain_Area = [item[3] for item in sorted_list]
        StrType = [item[4] for item in sorted_list]
        preI_Length = [item[5]*lfpcorr for item in sorted_list]

        ### Fix slope function
        i = 1
        while i < len(preElev):
            i -= 1
            aux_elev = [preElev[i]]
            aux_dist = [preI_Length[i]]
            j = i + 1
            while j < len(preElev) and preElev[i] <= preElev[j] + 0.1:
                aux_elev.append(preElev[j])
                aux_dist.append(preI_Length[j])
                j += 1
            if len(aux_elev) > 1 and j < len(preElev):
                aux_elev.append(preElev[j])
            while i <= j:
                if len(aux_elev) > 1 and i < len(preSlope) and i < j:
                    slope_aux = (aux_elev[0] - aux_elev[-1]) / float(sum(aux_dist))
                    if slope_aux <= 0:
                        slope_aux = 0.1 / float(sum(aux_dist))
                    preSlope[i] = slope_aux
                elif i == len(preElev) - 1:
                    preSlope[i] = 0.1 / float(aux_dist[-1])
                i += 1
        preSlope = [0.000001 if x <= 0 else x for x in preSlope]

        ### Time of concentration calc
        velmeth_prop = zip(preSlope, StrType, preI_Length, preDrain_Area)

        preType = []
        preMixed = []
        preTot_Length = []
        preVel = []
        preI_Time = []
        preTot_Time = []
        preWidth = []
        preDepth = []
        preXarea = []
        preAvgArea = []
        totlength = 0
        tottime = 0
        const = (pow(cellSize, 2) / 27878400) * (pow(3.28084, 2))
        for vel_prop in velmeth_prop:
            slope = round(vel_prop[0],6)
            str_type = vel_prop[1]
            dlg = round(vel_prop[2],1)
            acc = round(vel_prop[3],6)
            avgarea = round(acc * const,6)
            width = -1
            depth = -1
            xarea = -1
            totlength = totlength + dlg
            oldtotlength = totlength - dlg
            themixed = ' No'
            flowtype = 'overland'
            if str_type == 1:
                dt = round(0.007 * (sheet_n * dlg) ** 0.8 / (sheet_P ** 0.5 * slope ** 0.4),4)
                thevel = round(dlg / (dt * 3600),3)
            elif str_type == 2:
                overdist = sheet_L - oldtotlength
                if flowtype != 'swale' and overdist > 0:
                    swaledist = totlength - sheet_L
                    overdt = 0.007 * (sheet_n * overdist) ** 0.8 / (sheet_P ** 0.5 * slope ** 0.4)
                    swalevel = (swale_coef * slope ** 0.5) / 3600
                    swaledt = swaledist / (swalevel * 3600)
                    dt = round(overdt + swaledt,4)
                    thevel = round(dlg / (dt * 3600.0),3)
                    themixed = 'Yes'
                else:
                    flowtype = 'swale'
                    thevel = round((swale_coef * slope ** 0.5) / 3600,3)
                    dt = round(dlg / thevel / 3600,4)
            elif str_type == 3 and flowtype != 'channel':
                flowtype = 'swale'
                thevel = round((swale_coef * slope ** 0.5) / 3600,3)
                dt = round(dlg / thevel / 3600,4)
            else:
                flowtype = 'channel'
                width = widthcoef * (avgarea) ** widthexp
                depth = depthcoef * (avgarea) ** depthexp
                xarea = xareacoef * (avgarea) ** xareaexp
                hr = xarea / (2.0 * depth + width)
                thevel = round(1.49 / chan_n * hr ** 0.66667 * slope ** 0.5,3)
                dt = round(dlg / thevel / 3600,4)
            tottime = round(tottime + dt,4)
            preType.append(flowtype)
            preMixed.append(themixed)
            preTot_Length.append(totlength)
            preVel.append(thevel)
            preI_Time.append(dt)
            preTot_Time.append(tottime)
            preWidth.append(width)
            preDepth.append(depth)
            preXarea.append(xarea)
            preAvgArea.append(round(avgarea,6))

        Pixel.append([int(elem) for elem in prePixel])
        Type.append(preType)
        Mixed.append(preMixed)
        Elev.append([round(float(elem),1) for elem in preElev])
        Slope.append([round(float(elem),6) for elem in preSlope])
        AvgArea.append(preAvgArea)
        Width.append([round(float(elem),2) for elem in preWidth])
        Depth.append([round(float(elem),2) for elem in preDepth])
        Xarea.append([round(float(elem),2) for elem in preXarea])
        I_Length.append([round(float(elem),1) for elem in preI_Length])
        Tot_Length.append([round(float(elem),1) for elem in preTot_Length])
        Vel.append([round(float(elem),2) for elem in preVel])
        I_Time.append([round(float(elem),3) for elem in preI_Time])
        Tot_Time.append([round(float(elem),4) for elem in preTot_Time])

        tc_list.append(preTot_Time[-1])

        Delete_management(os.path.join(optfolder, "mask_temp" + str(idx) + ".tif"))

    SetParameterAsText(set_i, json.dumps(Pixel)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Type)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Mixed)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Elev)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Slope)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(AvgArea)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Width)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Depth)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Xarea)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Tot_Length)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Vel)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(I_Time)); set_i = set_i + 1
    SetParameterAsText(set_i, json.dumps(Tot_Time)); set_i = set_i + 1


    # add "tc_list" to "subshed.shp"
    tc_update = UpdateCursor(subshed_poly)
    for tc_lst,tc in enumerate(tc_update):
        sheds_tc_list = tc_list[tc_lst]
        sheds_tc = float(sheds_tc_list)  # 5/23/2017: type is adjusted to match above Field type
        tc.Tc = sheds_tc
        tc_update.updateRow(tc)
        tc_lst = tc_lst + 1

    subshed = subshed_poly
    arcid_list = []
    shedtab = SearchCursor(subshed, "", "", "ARCID", "")
    for s in shedtab:
        arcid = s.getValue("ARCID")
        arcid_list.append(str(int(arcid)))

    # re-reading because above variables lead to shapefile lock and prohibit file deletion
    subs = SearchCursor(subshed_poly)
    for s, sub in enumerate(subs):
        RasterToPolyline_conversion(os.path.join(optfolder, "LongPathSub" + str(s) + ".tif"),
                                          os.path.join(optfolder, "Longest_Path_Sub_" + str(s + 1) + ".shp"),
                                          "ZERO", "0", "NO_SIMPLIFY", "Value")

# *******************************************************************************************************
# clean "vel_meth" directory after indexed looping [delete everything except "velmethtables" and *.exe]
# *******************************************************************************************************
if os.path.exists(fcp):
    Delete_management(fcp)
for i in range(0, no_subwatersheds, 1):
    Delete_management(os.path.join(optfolder, "streamgrid" + str(i) + ".tif"))

FromNode = []
ToNode = []
sr = SearchCursor(subrivers, "", "", "GRID_CODE;FROM_NODE;TO_NODE", "")
for node in sr:
    fn = node.getValue("FROM_NODE")
    tn = node.getValue("TO_NODE")
    FromNode.append(fn)
    ToNode.append(tn)

# "reach_check_lst" is to check if there any reaches.
# If there are no reaches then watershed is treated as with single basin.
reach_check_lst = [x for x in FromNode if x in ToNode]

sr_map = SpatialReference(4326)
Project_management(subshed_poly, os.path.join(optfolder, "subshed_proj.shp"), sr_map)

SetParameterAsText(set_i, len(reach_check_lst)); set_i = set_i + 1
SetParameterAsText(set_i, os.path.join(optfolder, "subshed_proj.shp")); set_i = set_i + 1
SetParameterAsText(set_i, cn_list); set_i = set_i + 1
SetParameterAsText(set_i, subareami); set_i = set_i + 1
