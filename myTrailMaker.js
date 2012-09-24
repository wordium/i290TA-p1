// Create an empty global object where we can store settings for connecting to Delicious
var delicious = {};

// When users click on a link, open it in a new window
$('a').live('click', function() {
    window.open($(this).attr('href'));
    return false;
});


$(document).ready( function(){

    var trailLength = 0;

//set default display. Hide username, password and buttons until user has selected display  by clicking on the radio button
    $('#find-trail').hide();
    $('#extend-trail').hide();
    $('#save-trail').hide();

//toggle display when user clicks on radio button to choose whether to create
// a new trail or append to existing trail
    $('#selectTrail').change( function() {
        if( $('input[name=rSelectTrail]:checked').val() == "new trail"){
            $('#save-trail').show();
            $('#find-trail').hide();
            $('#extend-trail').hide();

            //resets trail boxes in case user previously added to trail
            $('#new-trail').droppable('option', 'disabled', false);
            $('#trail h2').text("Trail Builder"); 

            //clear up the new-trail box area
            $('#new-trail ul').html("");

            //make the new trail box area droppable and sortable
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
            $('#new-trail ul').sortable();
        }
        else if( $('input[name=rSelectTrail]:checked').val() == "existing trail"){
            $('#find-trail').show();
            $('#save-trail').hide();
            $('#extend-trail').show();
            $('#new-trail ul').html(""); //clear up the new-trail box area and use it to display the existing trail
            
            //existing trail should not be modified in the box area
            $('#new-trail').droppable('option', 'disabled', true);

            //allow user to drop new bookmarks in the extend-trail box area only. Make the extend-trail box area sortable
            $('#extend-trail').droppable({
                accept: 'li',
                drop: function(event, ui) {
                    // Don't confuse ul, the <ul> unordered-list with ui, the user interface element
                    // .draggable('disable') says that we want to remove the draggable behavior
                    $(ui.draggable)
                        .draggable('disable')
                        .css({top: '0px', left:'0px'})
                        .appendTo('#extend-trail ul');
                }
            });
            $('#extend-trail ul').sortable();
        }//end else if    
    }); //end selectTrail radio botton toggle

// load bookmarks submit button
	$('#load-bookmarks').submit(function() {

        // validating that username and/or search tag has been entered
       if ( ($("#username").val()=="") && ($("#searchtag").val()=="")) {
            alert("Please enter a username and/or tag to search for.");
            return false;
        }

        // call function to show bookmarks.
    	displayBookmarks();
        return false;
        
    });//end #load-bookmarks.submit


    //upon clicking the "save trail button do the following  
    $('#save-trail').submit( function(){
        //upon clicking the "save trail" button, prompt the user to enter a trail name, otherwise, use My New Trail by default
        $('#trail h2').text(prompt('Enter a name for the new trail: ') || 'My New Trail');

        //use the global object delicious to store the key-value pair of username and password
        delicious.username = $('#save-username').val();
        delicious.password = $('#save-password').val();
        delicious.stepNum = 0;
 
        saveTrail();
        return false;
    });

    //Retrieve an existing trail upon clicking the "Get Your Trail" button
    $('#find-trail').submit( function(){
        displayTrail();
        return false;
    });

    //add additional bookmarks to an existing trail upon clicking "Add to Trail" button
    $('#extend-trail').submit( function(){
        
        // if password and username are blank, alert the user
        if( ($("#append-password").val()=="") || ($("#trail-username").val()=="") ){
            alert("Please enter a user name and password to add to your trail.");
            return false;
        }

        delicious.password = $('#append-password').val();
        delicious.username = $('#trail-username').val();
        delicious.stepNum = delicious.trailLength;

        appendToTrail();
        return false;
    });


}); //end document ready


/******************************************
Function: saveTrail
Description: Publish the first bookmark in the new-trail box area to Delicious.com one by one. 
             The function is called periodically until all bookmarks in new-trail box area have
             been published. The published bookmark is removed from the box area
*********************************************/
function saveTrail(){
    //step number should start from 1
     delicious.stepNum++;

    // Change spaces in the trail name to underscores to follow our trail syntax
    // By default, the .replace() method doesn't replace ALL the occurrances
    // of a string, so we are using the global flag in our regular expression
    // to replace everything. The global flag is set with the "g" after
    // the regular expression (/ /g)
    var newTrailName = 'trail:' + $('#trail h2').text().toLowerCase().replace(/ /g, '_');

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


/******************************************
Function: getFeedsByTag
Description: Construct the URL string needed to retrievel a list of RSS feeds from Delicious.com.
*********************************************/
function getFeedsByTag(){
    var tag = $('#searchtag').val();

    //fetch all the bookmarks belongs to the inputed user name from Delicious 
    //limit the number of bookmarks displayed to 10
    var feedURL = "http://feeds.delicious.com/v2/json/tag/" + tag 
           + "?count=10" + "&callback=?" ;
    return feedURL; 
}


/******************************************
Function: displayBookmarks
Description: retrieve a list of bookmarks by either a Delicious.com username, or a tag keyword, or both.
            Display the retrieved bookmarks to the user. Allow user to drag the bookmarks from the list
            to the other side of the webpage.
*********************************************/
function displayBookmarks(){

    var username = $('#username').val();
    var searchtag = $('#searchtag').val();

    var deliciousFeedStr = "";

    if (username == "" && searchtag != ""){ //searching by tag only
        deliciousFeedStr = getFeedsByTag();
    }
    else if (username != "" && searchtag == ""){ //searching by username only
        deliciousFeedStr = "http://feeds.delicious.com/v2/json/" + username
       + "?count=10" + "&callback=?" ;  // currently hard coded to retrieve only 10 listings
    }
    else if (username != "" && searchtag != ""){ //searching by both username and tag
        deliciousFeedStr = "http://feeds.delicious.com/v2/json/" + username + "/" + searchtag
        + "?count=10" + "&callback=?"; // also hardcoded to retrieve only 10 listings
    }

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
        $('#searchtag').val("");
    }); //end .getJSON
} //end displayBookmarks function

/*******************************
Function: displayTrail
Description: retrievel a list of bookmarks from Delicious.com using a username provided by the user.
            or using a tag keyword provided by the user, or both
            Display the retrieved bookmarks to the user. 
*********************************/
function displayTrail(){

    //Get the user's username and the name of a trail. 
    var username = $('#trail-username').val();
    var trailname = $('#trail-name').val();
    var trailLength = 0;


    if (username == "" ){ // if username is blank
        alert("Please enter your Delicious username.");
        return false;
    }
    else if (trailname == ""){ // if trailname is blank
        alert("Please enter your trail name. E.g. trail:my_trail");
        return false;
    }

    $('#trail h2').text(trailname); 
   
    //searching by both username and trail name. Trail name is a tag on the bookmarks.
    var deliciousFeedStr = "http://feeds.delicious.com/v2/json/" + username + "/" + trailname
       + "?callback=?"; 

    $.getJSON(deliciousFeedStr, function(json){
        //first clear the previous bookmark list
        $('#new-trail ul').html("");

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
                .appendTo('#new-trail ul');

            //count the number of steps in the trail
            trailLength++;
        });
        //make each bookmark list item draggable using JQuery UI
       $('#new-trail ul').sortable('option', 'disabled', true);
       $('#new-trail').droppable('option', 'disabled', true);
       
        //store the length of the trail
       delicious.trailLength = trailLength;
       return false;

    });//end getJSON
} //end displayTrail function


/**************************** 
Function: appendToTrail
Description: Add additional bookmarks to an existing trail by appending the bookmarks at the end of the trail.
            The exisitng trail name is added to the new bookmarks as a tag. The step number for a new bookmarks starts from 
            the end of the original trail.
*****************************/
function appendToTrail(){

    delicious.stepNum++;

    //get the first bookmark that needs to be added
    var bookmark = $('#extend-trail li:first');
    var trailName = $('#trail-name').val();

    // Assemble the data to send to Delicious
    var postData = {
        url: bookmark.find('a').attr('href'),
        description: bookmark.find('a').text(),
        extended: bookmark.data('extended'),
        tags: (bookmark.data('tags') == "" ? "" : bookmark.data('tags').join(',') + ',trail:') + trailName + ',' + 'step:' + delicious.stepNum,
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
            $('#extend-trail li:first').remove(); // Remove the line for the bookmark we just saved
            if ($('#extend-trail li').length > 0) {
                // Save the next bookmark in the trail in 1000ms (1 second)
                // We have to wait this period of time to comply with the
                // terms of the Delicious API. If we don't we may have access denied.
                setTimeout(appendToTrail, 1000);
            } else {
                // We're done saving the trail. clear the passwords
                window.delicious_password = null;
                $('#append-password').val("");
                displayTrail();
                alert ("Your trail has been updated!");
            }
        }
    }); //end getJSON to post trail
} //end appendToTrail function
