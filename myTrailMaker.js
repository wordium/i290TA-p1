  // Create an empty global object where we can store settings for connecting to Delicious
  //javascript object stores key value pairs. E.g
  /*var fruit = {
        kind: "grape",
        color: "red",
        quantity: 12,
        tasty: true
    };*/
    var delicious = {};

// When users click on a link, open it in a new window
$('a').live('click', function() {
    window.open($(this).attr('href'));
    return false;
});

$(document).ready( function(){

	$('#load-bookmarks').submit(function() {
    	var username = $('#username').val();
        var searchtag = $('#searchtag').val();
        alert(username + searchtag);

        var deliciousFeedStr = "";

        if (username == "" && searchtag != ""){
            deliciousFeedStr = getFeedsByTag();
            alert(deliciousFeedStr);
        }
        else if (username != "" && searchtag == ""){
            deliciousFeedStr = "http://feeds.delicious.com/v2/json/" + username 
           + "?count=10" + "&callback=?" ;
            alert(deliciousFeedStr);
        }
    	//fetch all the bookmarks belongs to the inputed user name from Delicious 
//    	var deliciousFeedStr = "http://feeds.delicious.com/v2/json/tag/" + username 
//           + "?count=10" + "&callback=?" ;
          	

    	$.getJSON(deliciousFeedStr, function(json){

            //first clear the previous bookmark list
            $('#bookmarks ul').html("");

    		//below is a wrapper function that processes the json data.
            // for each fetched delicious bookmark, display them as a list of hyperlinks
    		$(json).each(function(index) {
                // this.u // url
                // this.d // description
                // this.n // extended notes
                // this.t // array of tags
                $('<li></li>').html('<a href="' + this.u + '">' + this.d + '</a>')
					.data('extended', this.n)
					.data('tags', this.t)
					.appendTo('#bookmarks ul');
            });
            //make each bookmark list item draggable using JQuery UI
            $('#bookmarks li').draggable({revert: true});

            //clear the user name input field
            $('#username').val("");

    	}); //end .getJSON
        return false;
        
    });//end #load-bookmarks.submit

    //make the bookmarks droppable using JQuery UI
    $('#new-trail').droppable({
        accept: 'li',
        drop: function(event, ui) {
            // Don't confuse ul, the <ul> unordered-list with ui, the user interface element
            // .draggable('disable') says that we want to remove the draggable behavior
            $(ui.draggable)
                .draggable('disable')
                .css({top: '0px', left:'0px'})
                .appendTo('#new-trail ul');
        }
    });

    //make the bookmarks sortable after dropped into the trail list
    $('#new-trail ul').sortable();

    //upon clicking the "save trail button do the following  
    $('#save-trail').submit( function(){
        //upon clicking the "save trail" button, prompt the user to enter a trail name, otherwise, use My New Trail by default
        $('#new-trail h2').text(prompt('Enter a name for the new trail: ') || 'My New Trail');

        //use the global object delicious to store the key-value pair of username and password
        delicious.username = $('#save-username').val();
        delicious.password = $('#save-password').val();
        delicious.stepNum = 0;
 
        saveTrail();
        return false;
    });

}); //end document ready

function saveTrail(){
    //step number should start from 1
     delicious.stepNum++;

    // Change spaces in the trail name to underscores to follow our trail syntax
    // By default, the .replace() method doesn't replace ALL the occurrances
    // of a string, so we are using the global flag in our regular expression
    // to replace everything. The global flag is set with the "g" after
    // the regular expression (/ /g)
    var newTrailName = 'trail:' + $('#new-trail h2').text().toLowerCase().replace(/ /g, '_');

    var bookmark = $('#new-trail li:first');

    // Assemble the data to send to Delicious
    var postData = {
        url: bookmark.find('a').attr('href'),
        description: bookmark.find('a').text(),
        extended: bookmark.data('extended'),
        //if bookmark.data('tags') == "" then "" else bookmark.data('tags').join(',')
        tags: (bookmark.data('tags') == "" ? "" : bookmark.data('tags').join(',') + ',') + newTrailName + ',' + 'step:' + delicious.stepNum,
        method: 'posts/add',
        username: delicious.username,
        password: delicious.password
    }; //end construct postData

  

    // Send the data to Delicious through a proxy and handle the response
    // Use $.post if the script is located on the same server
    // Otherwise, use $.get to avoid cross-domain problems
    // $.post('delicious_proxy.php',
    $.getJSON("http://courses.ischool.berkeley.edu/i290-iol/f12/resources/trailmaker/delicious_proxy.php?callback=?",
    postData,
     function(rsp){
        if (rsp.result_code === "access denied") {
            alert('The provided Delicious username and password are incorrect.');
        } else if (rsp.result_code === "something went wrong") {
            alert('There was an unspecified error communicating with Delicious.');
        } else if (rsp.result_code === "done") {
 
            // Bookmark was saved properly
            $('#new-trail li:first').remove(); // Remove the line for the bookmark we just saved
            if ($('#new-trail li').length > 0) {
                // Save the next bookmark in the trail in 1000ms (1 second)
                // We have to wait this period of time to comply with the
                // terms of the Delicious API. If we don't we may have access denied.
                setTimeout(saveTrail, 1000);
            } else {
                // We're done saving the trail
                window.delicious_password = null;
                alert ("Your trail has been saved!");
            }
        }
    }); //end getJSON to post trail
} //end saveTrail

function getFeedsByTag(){
    var tag = $('#searchtag').val();

    //fetch all the bookmarks belongs to the inputed user name from Delicious 
    var feedURL = "http://feeds.delicious.com/v2/json/tag/" + tag 
           + "?count=10" + "&callback=?" ;
    return feedURL; 
}