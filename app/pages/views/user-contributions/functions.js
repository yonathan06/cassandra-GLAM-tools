let ACTIVE_ITEM_ID;

function getUrl() {
    const db = window.location.href.toString().split('/')[3];
    const groupby = $('#groupby-select').val();
    const subcat = window.location.href.toString().split('/')[5];
    const subcatQ = subcat ? "&cat="+subcat : "";
    const query = subcat ? ("?groupby=" + groupby + "&cat=" + subcat) : "?groupby=" + groupby;
    return "/api/"+db+"/file/upload-date"+query;
}

function getUrlDataset() {
    let db = window.location.href.toString().split('/')[3];
    let subcat = window.location.href.toString().split('/')[5];
    let groupby = $('#groupby-select').val();
    //let query = subcat ? ("?groupby=" + groupby + "&cat=" + subcat) : "?groupby=" + groupby;
    return "/api/" + db + "/file/upload-date/dataset/" + groupby;
}

function getUrlAll(){
    let db = window.location.href.toString().split('/')[3];
    let subcat = window.location.href.toString().split('/')[5];
    let groupby = $('#groupby-select').val();
    let query = subcat ? ("?groupby=" + groupby + "&cat=" + subcat) : "?groupby=" + groupby;
    return "/api/"+db+"/file/upload-date-all" + query;
}

function pad(str, max) {
    str = str.toString();
    return str.length < max ? pad("0" + str, max) : str;
}

function sidebar(type) {
    const template_source = "/views/user-contributions/tpl/user-contributions.tpl";
    const target = "#right_sidebar_list";
    
    $.get(template_source, function(tpl) {
	$.getJSON(getUrl(), function(data) {
	    data.forEach(function (d) {
		let total = 0;
		
		d.files.forEach(function (d) {
		    total += +d.count;
		});
		d.total = total;
		
		d.user_id = d.user.replace(/\s/g, "_");
	    });
	    
	    if (type === "by_num") {
		data = data.sort(function(a,b) {
		    return b.total - a.total;
		});
	    } else {
		data = data.sort(function(a,b) {
		    if (a.user < b.user) { return -1; }
		    if (a.user > b.user) { return 1; }
		    return 0;
		});
	    }
	    
	    data.forEach(function (d) {
		d.total = nFormatter(d.total);
	    });
	    
	    let template = Handlebars.compile(tpl);
	    $(target).html(template({users: data, langDict}));
	    
	    highlight();
	});
    });
}

function sorting_sidebar() {
    let byNumEl = $("#by_num");
    let byNameEl = $("#by_name");
    byNumEl.on("click", function() {
	if (byNumEl.hasClass("active_order") ) {
	    //console.log("già selezionato")
	} else {
	    byNameEl.toggleClass("active_order");
	    byNumEl.toggleClass("active_order");
	    sidebar("by_num");
	    byNumEl.css("cursor","default");
	    byNameEl.css("cursor","pointer");
	}
    });
    
    byNameEl.on("click", function() {
	if (byNameEl.hasClass("active_order") ) {
	    //console.log("già selezionato")
	} else {
	    byNameEl.toggleClass("active_order");
	    byNumEl.toggleClass("active_order");
	    sidebar("by_name");
	    byNameEl.css("cursor","default");
	    byNumEl.css("cursor","pointer");
	}
    });
}

// Made this link the same as in other pages.
function download() {
    // remove old link
    $("#download_dataset a").remove();
    // recreate download link based on timespan
    $('<a href="' + getUrlDataset() + '" download="' + "user_contributions.csv" + '">'+langDict.downloadDataset+'</a>').appendTo('#download_dataset');
}


function download_json(){
    // remove old link
    $("#download_json a").remove();
    // recreate download link based on timespan
    var page = "user-contributions";
    $('<a href="' + 'data:text/plain;charset=utf-8,'+  encodeURIComponent(generate_json(page)) + '" download="' + "readme.json" + '">' + langDict.downloadReadme + '</a>').appendTo('#download_json');
}

// Generates a JSON with descriptions for the headers of the columns contained in the 
// downloadable date within the page. 
function generate_json(page){
	var csv = "used in,name,title,type,description,format,bareNumber\n\
views,Date,Date,date,the date in which the views occurred - in ISO8601 format YYYY-MM-DD,%y/%m/%d,\n\
user-contributions,Date,Date,date,the date in which the views occurred - in ISO8601 format YYYY-MM-DD,%y/%m/%d,\n\
views,Views,Total of visualizations received,integer,Total of visualizations the items in the GLAM have had within the specified time period. The loading of a page which contains the image is considered as a visualization of said image.,default,TRUE\n\
user-contributions,User,Username,string,The Wikimedia username of a user who has made contributions to the GLAM in question.,default,\n\
user-contributions,Count,Count of contributions,integer,Total count of contributions (creations, edits and deletions) made by the User to the items of the GLAM.,default,TRUE\n\
count,Count,Count of contributions,integer,Total count of contributions (creations, edits and deletions) made by the User to the items of the GLAM.,default,TRUE\n\
usage,File,File name,string,Name of a Wikimedia Commons file.,default,\n\
usage,Project,Wikimedia project,string,Wikimedia project in which the file has been used.,default,\n\
usage,Page,Page title,string,Title of the page in the Project which uses the File.,default,\n";
	var lines = csv.split("\n");
	var headers = lines[0].split(",");
	var json = "";
	json += '{\n\t"schema":{\n';
	json += '\t\t"fields": [\n';

	for (var i = 1; i < lines.length; i++) {
		var current = lines[i].split(",");
		if (page == current[0]) {
		json += '\t\t\t{\n';
			for (var j = 1; j < headers.length; j++) { // won't add empty information to the JSON
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
function highlight() {
    if (ACTIVE_ITEM_ID !== undefined) {
	$('#' + ACTIVE_ITEM_ID).closest('.list_item').addClass('list_item_active');
    }
    
    $(".list_item").on("click", function() {
	
	let element = $(this).find('.item').attr("id");
	
	// highlight Sidebar and show bars
	if ($(this).hasClass('list_item_active')) {
	    hideUserContributionsBars();
	    $(".list_item").removeClass("list_item_active");
	    ACTIVE_ITEM_ID = undefined;
	} else {
	    showUserContributionsBars(element);
	    $(".list_item").removeClass("list_item_active");
	    ACTIVE_ITEM_ID = element;
	    $(this).addClass("list_item_active");
	}
	
    });
}

$(document).ready(function() {
    setCategory();
    sidebar("by_num");
    dataviz();
    how_to_read();
    download();
	download_json();
    switch_page();
    sorting_sidebar();
    $('#groupby-select').change(function() {
	dataviz();
	download();
    });
});
