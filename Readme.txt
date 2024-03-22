GISHydroWEB v0.2
June, 2021

ArcGIS v10.5 or higher

GISHydroWEB consists of a set of Geoprocessing Services, which have to be deployed using an ArcGIS Server account.

In order to do this, the GISHydroWEB toolbox and geodatabase must be retrieved from the program developer (Javier Mardones, javier.mardones@mbakerintl.com). This can be easily done using SHA Azure DevOps account (Javier will push all the files to MDOT's GISHydro DevOps account)

Once the toolbox and scripts are copied (or pulled from DevOps), a system path for the GISHydro data folder must be defined. Important: The toolbox must be copied with the script folder to the same folder.

The scripts have a hardcoded system variable path for the "data" folder. The name of the system variable is "GISHydro_Dir", and it must be set up locally in the server.
The path must be where the data folder is located, example: D:\GISHydroWEB

To create a system variable in Windows 10:
- In Search, search for and then select: System (Control Panel)
- Click the Advanced system settings link.
- Click Environment Variables. In the section System Variables create a new variable "GISHydro_DIR"
- In the Edit System Variable (or New System Variable) window, specify the path of your GISHydroWEB data to the newly created "GISHydro_Dir" environment variable. Click OK. Close all remaining windows by clicking OK.

Publishing the Geoprocessing Services:

The GISHydro tools consist of two subsets of tools:

1. GISHydro
2. Tools

The GISHydro tool has all the required scripts to make a GISHydroWEB project (e.g., Project creation, Delineation, etc.), while the Tools tool has optional scripts that will help the user in the process (e.g., loading layers to the framework)

The GISHydro tool scripts must be executed in a specific order:

1. DataSelection*
3. BasinOutputs
4. Flowpaths
5. Outlets
6. Subsheds
7. SetTOC
8. Transect
9. Reservoir
10. PrecipitationDepths
11. SetTOC

While the Tools tool scripts can be executed in any order. However, they must be executed after the GISHydro tool is done.

- DesignStorm
- LoadLayer
- Tasker
- DelCheck

*Once the "DataSelection" has run, a project folder ("project") will be created (if it was not created previously), and a new project will be created inside the "project" folder.
The tools already contain default values included, however, most of the tools require an input folder (Project Name) that must be typed manually (or copied) from the newly created project in the "project" folder (e.g., "20210602_160047_My_Project"). 

To publish these services please refer to ESRI's tutorial: https://enterprise.arcgis.com/en/server/10.8/publish-services/windows/a-quick-tour-of-publishing-a-geoprocessing-service.htm

Once the geoprocessing services are published, a link will be created (REST API) that will allow to execute the tool from the Server URL. Use the link for each service in the GISHydro JavaScript.

Please refer to the GISHydroWEB documentation for the GISHydroWEB architecture.