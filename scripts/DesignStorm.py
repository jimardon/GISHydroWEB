# -*- coding: utf-8 -*-
"""
Modified 02/2021

@author: Javier.Mardones
"""

from arcpy import (GetParameterAsText, SetParameterAsText)
import json

stormdur = json.loads(GetParameterAsText(0))
stormdata = json.loads(GetParameterAsText(1))
dt = float(GetParameterAsText(2))

tdist = [5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 2880]
tdist = [float(x)/60 for x in tdist]

stormtype = []
theprecip = []
nlines = []

imax_rd = 0
for nn in stormdur:

    iduration = int(nn)

    if iduration == 6:
        imax = 7
    elif iduration == 12:
        imax = 8
    elif iduration == 24:
        imax = 9
    elif iduration == 48:
        imax = 10

    pdist = []
    for i in range(11):
        pdist.append(float(stormdata[i + imax_rd]))

    imax_rd = imax_rd + 11

    tmax = float(iduration)
    itypeii = 0

    if pdist[0] < 0:
        itypeii = 1

    if itypeii == 0:
        stormtype.append(r'rt')
    else:
        stormtype.append(r'Type')

    sp = [0]*(2*(imax+1)+1)
    st = [0]*(2*(imax+1)+1)
    pdiff = []
    tdiff = []

    if itypeii == 0:
        pdiff.append(pdist[0]/2)
        tdiff.append(tdist[0]/2)
        for i in range(10):
             pdiff.append((pdist[i+1] - pdist[i])/2)
             tdiff.append((tdist[i+1] - tdist[i])/2)
        sp[imax+1] = pdist[imax]/2
        st[imax+1] = tdist[imax]/2
        for i in range(imax+1):
             sp[imax+i+2] = sp[imax + i + 1] + pdiff[i]
             st[imax+i+2] = st[imax + i + 1] + tdiff[i]
        for i in range(imax+1):
             sp[i+1] = pdist[imax] - sp[2*(imax + 1) - i]
             st[i+1] = tdist[imax] - st[2*(imax + 1) - i]

        n = int(tmax/dt)

        p = []
        for i in range(n+1):
            tt = round(dt * i,1)
            ii = 1
            ifound = 0
            while ifound == 0:
                ii = ii + 1
                if ii > len(st): break
                if tt >= st[ii-2] and tt < st[ii-1]:
                    ifound = ii
                    p.append(sp[ii-2] + (sp[ii-1] - sp[ii-2]) / (st[ii-1] - st[ii-2]) * (tt - st[ii-2]))

        p.append(pdist[imax])


        for i in range(n+1):
            theprecip.append(str(abs(round(p[i]/pdist[imax],4))))
        nlines.append(n+1)

SetParameterAsText(3, json.dumps(stormtype))
SetParameterAsText(4, json.dumps(theprecip))
SetParameterAsText(5, json.dumps(nlines))
