/* 
Files related to the creation and download of a JSON file which describes the
columns contained within the .csv that is downloadable in the following pages:

/GLAM-name/user-contributions
/GLAM-name/views
/GLAM-name/usage

The JSON follows the standards defined in http://frictionlessdata.io 
*/

// Creates a button to download the JSON, as well as generates the file and the link to it.
function download_json(page_name){
    // remove old link
    $("#download_json a").remove();
    // recreate download link based on timespan
    $('<a href="' + 'data:text/plain;charset=utf-8,'+  encodeURIComponent(generate_json(page_name)) + '" download="' + "readme.json" + '">' + langDict.downloadReadme + '</a>').appendTo('#download_json');
}

// Generates a JSON with descriptions for the headers of the columns contained in the 
// downloadable date within the page. 
function generate_json(page){
	const csv = "used in,name,title,type,description,format,bareNumber\n\
views,Date,Date,date,the date in which the views occurred - in ISO8601 format YYYY-MM-DD,%y/%m/%d,\n\
user-contributions,Date,Date,date,the date in which the views occurred - in ISO8601 format YYYY-MM-DD,%y/%m/%d,\n\
views,Views,Total of visualizations received,integer,Total of visualizations the items in the GLAM have had within the specified time period. The loading of a page which contains the image is considered as a visualization of said image.,default,TRUE\n\
user-contributions,User,Username,string,The Wikimedia username of a user who has made contributions to the GLAM in question.,default,\n\
user-contributions,Count,Count of contributions,integer,Total count of contributions (creations, edits and deletions) made by the User to the items of the GLAM.,default,TRUE\n\
count,Count,Count of contributions,integer,Total count of contributions (creations, edits and deletions) made by the User to the items of the GLAM.,default,TRUE\n\
usage,File,File name,string,Name of a Wikimedia Commons file.,default,\n\
usage,Project,Wikimedia project,string,Wikimedia project in which the file has been used.,default,\n\
usage,Page,Page title,string,Title of the page in the Project which uses the File.,default,\n";
	let lines = csv.split("\n");
	let headers = lines[0].split(",");
	let json = "";
	json += '{\n\t"schema":{\n';
	json += '\t\t"fields": [\n';

	for (let i = 1; i < lines.length; i++) {
		let current = lines[i].split(",");
		if (page == current[0]) {
		json += '\t\t\t{\n';
			for (let j = 1; j < headers.length; j++) { // won't add empty information to the JSON
				if (current[j] != "") json += '\t\t\t\t"' + headers[j] + '": "' +current[j] + '",\n';
			}
		json =  json.substring(0, json.length - 2) + "\n"; // removes trailing comma
		json += '\t\t\t},\n';
		}
	}
	json =  json.substring(0, json.length - 2) + "\n"; // removes trailing comma
	json += "\t\t]\n\t}\n}";

	return (json);
}