const FIRST_CALL_LIMIT = 100;
const glam = window.location.href.toString().split('/')[3];
let TOTAL_IMAGES;
let IMAGES_RENDERED = 0;
let RENDERING = false;
let ACTIVE_ITEM_ID;

function getUrlAll() {
    const db = window.location.href.toString().split('/')[3];
    const groupby = $('#groupby-select').val();
    const subcat = window.location.href.toString().split('/')[5];
    const subcatQ = subcat ? "&cat="+subcat : "";
    return "/api/"+db+"/views?groupby=" + groupby + subcatQ;
}

function getUrlDataset() {
    const groupby = $("#groupby-select").val();
    const db = window.location.href.toString().split('/')[3];
    // console.log(groupby);
    return "/api/" + db + "/views/dataset/" + groupby;
}

function getUrlStats() {
    var db = window.location.href.toString().split('/')[3];
    const subcat = window.location.href.toString().split('/')[5];
    const subcatQ = subcat ? "?cat="+subcat : "";
    return "/api/" + db + "/views/stats"+subcatQ;
}

function getUrlFiles(){
	var db=window.location.href.toString().split('/')[3];
	return "/api/"+db+"/views/files";
}

function getUrlSidebar() {
	var db=window.location.href.toString().split('/')[3];
	return "/api/" + db + "/views/sidebar";
}

function getUrlSidebarLimit(limit) {
    let l = Number.isInteger(limit) ? "?limit=" + limit : "";
    const db = window.location.href.toString().split('/')[3];
    const subcat = window.location.href.toString().split('/')[5];
    let query = subcat ? (l ? l+ "&cat="+subcat : "?cat="+subcat) : l;
    return "/api/" + db + "/views/sidebar" + query;
}

function getUrlSidebar(limit, sort) {
    let l = Number.isInteger(limit) ? "?limit=" + limit : "";
    let s;
    if (sort === 'views' || sort === 'median' || sort === 'name') {
	s = '&sort=' + sort;
    } else {
	s = "";
    }
    const db = window.location.href.toString().split('/')[3];
    const subcat = window.location.href.toString().split('/')[5];
    let query = subcat ? (l+s ? (l + s + "&cat="+subcat) : "?cat="+subcat) : l+s;
    query = query ? query+ "&page=0" : "?page=0";
    return "/api/" + db + "/views/sidebar" + query;
}

function getUrlSidebarPaginated(page, sort) {
    let s;
    if (sort === 'views' || sort === 'median' || sort === 'name') {
	s = '&sort=' + sort;
    } else {
	s = "";
    }
    if (!Number.isInteger(page)) {
	console.error("Invalid page number", page);
    } else {
	const db = window.location.href.toString().split('/')[3];
	const subcat = window.location.href.toString().split('/')[5];
	let subcatQ = subcat ? "&cat="+subcat : "";
	return "/api/" + db + "/views/sidebar?page=" + page + s + subcatQ;
    }
}

function sidebar(type) {
    $.getJSON(getUrlStats(), function(stats) {
	// is rendering
	RENDERING = true;
	// save total
	TOTAL_IMAGES = stats.total;
	// get tempalte
	$.get("/views/page-views/tpl/views.tpl", function(tpl) {
	    $.getJSON(getUrlSidebar(FIRST_CALL_LIMIT, type), function(data) {
		// scroll up
		$('#right_sidebar_list').scrollTop(0);
		// render first part
		renderSidebarItems(tpl, data);
		//  set scroll handlers
		if (FIRST_CALL_LIMIT < TOTAL_IMAGES) {
		    $('#right_sidebar_list').off('scroll').scroll(loadMoreOnScroll.bind($('#right_sidebar_list'), type));
		}

		highlightOnClick();
	    });
	});
    });
}

function renderSidebarItems(tpl, data, append) {
	// if append not provided, set to false
	append = append || false;
	// process data
	data.forEach(function(d) {
		d.url = '/'+glam+'/file/'+d.img_name;
		d.img_name_text = d.img_name.replace(/_/g," ");
		d.img_name_id = d.img_name.replace(".jpg", "");
		d.tot = nFormatter(+d.tot);
		d.av = nFormatter(+d.av);
		d.median = nFormatter(+d.median);
	});
	// increment number of items rendered
	IMAGES_RENDERED += data.length;
	// compile template
	var obj = {};
	obj.files = data;
	var template = Handlebars.compile(tpl);
	// append existing content or replace html
	if (append){
		$('#right_sidebar_list').append(template(Object.assign({}, obj, { langDict })));
	} else {
		$('#right_sidebar_list').html(template(Object.assign({}, obj, { langDict })));
	}
	// set tatus to finished rendering
	RENDERING = false;
	// Prevent defaul when click on "view details"
	$('.view-details-link').off('click').on('click', function(e) {
		e.stopPropagation();
	});
}

function loadMoreOnScroll(sort_type) {
    // if reached end of div
    if (($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) && !RENDERING) {
	// if there are more elements to load
	if (IMAGES_RENDERED < TOTAL_IMAGES) {
	    // calc new page number
	    let page = getPageFromElementIdx(IMAGES_RENDERED + 1, 100);
	    //get template
	    $.get("/views/page-views/tpl/views.tpl", function(tpl) {
		// get data
		$.getJSON(getUrlSidebarPaginated(page, sort_type), function(data) {
		    RENDERING = true;
		    // last argument to true calls append() instead of html()
		    renderSidebarItems(tpl, data, true);
		    // manage click
		    highlightOnClick();
		});
	    });
	} else {
	    // show "no more elements"
	    $('#right_sidebar_list').append('<div class="mt-4 text-center">' + langDict.views.index.cards.suggestions.noElements + '</div>');
	    // remove handler
	    $('#right_sidebar_list').off('scroll', loadMoreOnScroll);
	}
    }
}
//
function sorting_sidebar() {
    $("#by_num").on("click", function(){
	if ($("#by_num").hasClass("active_order") ) {
	    //console.log("già selezionato")
	} else {
	    $("#by_name").removeClass("active_order");
	    $("#by_num").addClass("active_order");
	    $("#by_median").removeClass("active_order");
	    sidebar("views");
	    $("#by_num").css("cursor","default");
	    $("#by_name").css("cursor","pointer");
	    $("#by_median").css("cursor","pointer");
	}
    });

    $("#by_median").on("click", function(){
	if ($("#by_median").hasClass("active_order") ) {
	    //console.log("già selezionato")
	} else {
	    $("#by_name").removeClass("active_order");
	    $("#by_num").removeClass("active_order");
	    $("#by_median").addClass("active_order");
	    sidebar("median");
	    $("#by_name").css("cursor","pointer");
	    $("#by_num").css("cursor","pointer");
	    $("#by_median").css("cursor","default");
	}
    });

    $("#by_name").on("click", function(){

	if ($("#by_name").hasClass("active_order") ) {
	    //console.log("già selezionato")
	} else {
	    $("#by_name").addClass("active_order");
	    $("#by_num").removeClass("active_order");
	    $("#by_median").removeClass("active_order");
	    sidebar("name");
	    $("#by_name").css("cursor","default");
	    $("#by_num").css("cursor","pointer");
	    $("#by_median").css("cursor","pointer");
	}
    });
}

function download(){
    // remove old link
    $("#download_dataset a").remove();
    // recreate download link based on timespan
    $('<a href="' + getUrlDataset() + '" download="' + "views.csv" + '">'+langDict.downloadDataset+'</a>').appendTo('#download_dataset');
}

function download_json(){
    // remove old link
    $("#download_json a").remove();
    // recreate download link based on timespan
    var page = "views";
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


function how_to_read(){
    button = $("#how_to_read_button");
    box = $(".how_to_read");

    $("#how_to_read_button").click(function(){
	box.toggleClass("show");
	// console.log("click")
    });
}

function highlightOnClick() {

    if (ACTIVE_ITEM_ID !== undefined) {
	$('#' + ACTIVE_ITEM_ID).closest('.list_item').addClass('list_item_active');
    }

    // remove handler and set it on update elements
    $(".list_item").off("click").on("click", function() {
	var element = $(this).find('.id.item').attr("id");

	if ($(this).hasClass('list_item_active')) {
	    $(".list_item").removeClass("list_item_active");
	    ACTIVE_ITEM_ID = undefined;
	    hideFileLine();
	} else {
	    $(".list_item").removeClass("list_item_active");
	    $(this).addClass("list_item_active");
	    ACTIVE_ITEM_ID = element;
	    showFileLine($(this).data('imagename'));
	}

    });
}

function statDraw() {
    d3.json(getUrlAll(), function (error, data) {
	if (error) { window.location.href('/500'); }
	$("#usage_stat").append("<br><br>");
	$("#usage_stat").append(langDict.distinctMediaUsed + ": <b>" + data.totalImagesUsed + "</b>");
	$("#usage_stat").append("<br><br>");
	$("#usage_stat").append(langDict.totalProjectsInvolved + ": <b>" + data.totalProjects + "</b>");
	$("#usage_stat").append("<br><br>");
	$("#usage_stat").append(langDict.totalPagesEnhanced + ": <b>" + data.totalPages + "</b>");
    });
}

$(document).ready(function(){
	setCategory();
	how_to_read();
	sidebar("views");
	download();
	download_json();
	switch_page();
	sorting_sidebar();
	lineChartDraw("main_views_container", getUrlAll());
	$('#groupby-select').change(function() {
		$("#right_sidebar_list .list_item_active").trigger("click");
		// $("#main_views_container").empty();
		lineChartDraw("main_views_container", getUrlAll());
		download();
	});
	statDraw();
});
