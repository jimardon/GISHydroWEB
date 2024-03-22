function generatereport() {

  var report_element = reportbody()

  var opt_report = {
    margin: 0.5,
    filename: '' + full_project_name + '_REPORT.pdf',
    html2canvas: { scale: 4 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().from(report_element).set(opt_report).toPdf().get('pdf').then(function (pdf) {
    var totalPages = pdf.internal.getNumberOfPages();
    for (i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text('Page ' + i + ' of ' + totalPages, (pdf.internal.pageSize.getWidth() / 2.3), (pdf.internal.pageSize.getHeight() - 0.8));
    }
  }).save();
}

function reportbody() {

  var wrapper = document.createElement('div');

  var reportTable0 = '<table border="0" align="center">' +
    '<col width="300">' +
    '<col width="300">' +
    '<tr><td align="left">GISHydroWEB Release Version:</td><td align="left">' + webversion + '</td></tr>' +
    '<tr><td align="left">Project Name:</td><td align="left">' + proj_name + '</td></tr>' +
    '<tr><td align="left">Project ID:</td><td align="left">' + full_project_name + '</td></tr>' +
    '<tr><td align="left">Analysis Date:</td><td align="left">' + today + '</td></tr>' +
    '</table>';

  var modalTable2 = '<h4 align="center"><b>GISHydro Basin Report</b></h4>' +
    '<div style=" font-size: 12px">' +
    '<p></p>' +
    reportTable0 +
    '</div>' +
    '<div style="font-size: 12px">' +
    '<p></p><p align="left"><b>Data Selected</b></p>' +
    projectTable3 +
    '<p align="left"><b>Hydrologic Region Distribution</b></p>' +
    btableregion_html +
    '<p align="left"><b>Basin Properties</b></p>' +
    projectTable4 +
    projectTable5 +
    '<div align="center"><p style="color:#B21E28;width: 400px;text-align: center;" ><b>' + html_warning + '</b></p></div>'
  '</div>';

  var modalTable1 = '<h4 style="page-break-before: always">Basin Composition</h4>' +
    '<div style="font-size: 12px">' +
    '<p align="left"><b>Soils Data Statistics Percent</b></p>' +
    projectTable6 +
    '<p></p><p align="center"><b>Distribution of Land Use by Soil Group</b></p>' +
    projectTable1 +
    '<p style="page-break-before: always" align="center"><b>Distribution of Land Use by Curve Number</b></p>' +
    projectTable2 +
    '</div>';

  var modalTable3 = '<h4 style="page-break-before: always">FRRE Discharge</h4>' +
    '<div style="font-size: 12px">' +
    '<table border="0">' +
    '<col width="300">' +
    '<col width="300">';
  for (var j = 0; j < regioncount; j++) {
    modalTable3 += '<tr><td align="left">Hydrologic Region (weight %) ' + (j + 1) + '/' + regioncount + ':</td><td align="left">' + provstring[j][0] + ' (' + provstring[j][1] + '%)</td></tr>';
  }

  modalTable3 += '</table><p></p>' +
    '<p align="center" style="font-size:16px;"><b>' + document.getElementById("frreversion").value + ' Maryland Fixed Region Equations</b></p>' +
    '<p align="center"><b>Peak Flow (Total Area Weighted)</b></p>' +
    projectTable9 +
    '<p align="center"><b>Prediction Intervals (Total Area Weighted)</b></p>' +
    projectTable10;
  for (var j = 0; j < regioncount; j++) {
    modalTable3 += '<p style="page-break-before: always" align="center"><b>Hydrologic Region Parameters</b></p>' +
      projectTable11_r[j] +
      '<p align="center"><b>Hydrologic Region Flood Frequency Estimates</b></p>' +
      projectTable12_r[j] +
      '<p align="center"><b>Hydrologic Region Prediction Intervals</b></p>' +
      projectTable13_r[j] +
      '<p align="center" style="color:#B21E28;">';
    for (var i = 0; i < warning_message[j].length; i++) {
      modalTable3 += '<b>' + warning_message[j][i] + '</b><br/>';
    }
    modalTable3 += '</p>';
  }
  modalTable3 += '</div>';


  wrapper.innerHTML = modalTable2 + modalTable1 + modalTable3

  return wrapper

}