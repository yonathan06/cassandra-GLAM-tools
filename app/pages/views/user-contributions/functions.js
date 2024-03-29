let ACTIVE_ITEM_ID;

function getUrl() {
    const db = window.location.href.toString().split('/')[3];
    const groupby = $('#groupby-select').val();
    const subcat = window.location.href.toString().split('/')[5];
    const query = subcat ? ("?groupby=" + groupby + "&cat=" + subcat) : "?groupby=" + groupby;
    return "/api/"+db+"/file/upload-date"+query;
}

function getUrlDataset() {
    let db = window.location.href.toString().split('/')[3];
    let groupby = $('#groupby-select').val();
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



function download_json_helper(){
    download_json("user-contributions");
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
	download_json_helper();
    switch_page();
    sorting_sidebar();
    $('#groupby-select').change(function() {
	dataviz();
	download();
    });
});
