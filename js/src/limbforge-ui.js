
// Specify an initial hand
var specs = {
        hand: "right",
        size: 100,
        design: {
            name: "",
            directory: ""
        }
     },
	designRequestURL = "make4all.org",
    designs = [],
    hl;

$(document).ready(function(){
    // Fetch the manifest so it's available everywhere!
    $.get('designs.json').then(function(data){
		// store reference to designRequestURL so that the designRequest button works.
		designRequestURL = data["requestURL"];
		
        // store reference to full list of designs so they can be shown in a drop down.
        designs = data["designs"];

        // Populate design dropdown
        var $selector = $('#designSelector');
        _.each(designs,function(des){
            $selector.append("<option value='"+des.name+"'>"+des.name+"</option>");
        });

        // Listen for change events so the design can be selected
        $selector.on('change',function(e){
            var selected = _.findWhere(designs,{name: $(e.target).val()});
            selectDesign(selected);
        });

        // Load up the first design by default (raptor reloaded as of this writing)
        $selector.trigger("change");
    });

    function selectDesign(design){
        // This will be passed to other functions for loading and display
        specs.design = design;

        return $.get(design["directory"] + "manifest.json")
            .then(function(manifest){
                //////////////// Go !
                hl = new HandLoader(manifest,design);
                reloadDisplayHand();
            });
    }

    // Size Slider
    $('#flat-slider').slider({
        orientation: 'horizontal',
        range:       false,
        value:      specs.size,
        min: 100,
        max: 150,
        step: 5,
        slide: function( event, ui ) {
            $( "#sizeFeedback" ).text( "Size: " + ui.value + "%" );
            hl.setDisplayModelSize(ui.value);
        },
        stop: function( event, ui) {
            specs.size = ui.value;
        }
    });

    // Hand Selector
    var $handSelectors = $('.hand-graphic');
    $handSelectors.click(function(){
        $handSelectors.removeClass("selected");
        $(this).addClass("selected");
        specs.hand = $(this).data("selectedhand");
        hl.flip(specs.hand == "right");
    });

    // Download Button
    $('#downloadBtn').click(function(e){
        e.preventDefault();
        downloadHand();
    });

    //Upload Image Button invokes the file picker
    $('#refBtn').click(function(e){
        e.preventDefault();
		$('input').name = $('input').click();
    });

	// invoke load reference image when the file picker is done
	$('input').change(function(e) {
		loadReferenceImage(e);
	});
	
	//Request New Design Help Button
	$('#designBtn').click(function(e){
		e.preventDefault();
		openDesignRequestURL();
	});
	
    function zipFileName(specs){
        return "HandForge_" + specs.hand + "_" + specs.size + ".zip";
    }

    function GAObjectForSpecs(specs){
        // Create a 'productFieldObject' from the current hand specs
        return {
            'id': specs.design.name + specs.size + specs.hand,				// Product ID (string).
            'name': specs.design.name + "_" + specs.size + "_" + specs.hand, // Product name (string).
            'category': specs.design.name,   								// Product category (string).
            'variant': specs.hand,            							// Product variant (string).
            'position': specs.size           							// Product position (number).
            //'dimension1': 'Member',            							// Custom dimension (string).
            //'brand': 'Google',                							// Product brand (string).
            //'list': 'Search Results',         							// Product list (string).
        }
    }

    function reloadDisplayHand(){
        // Remove any prior hand that was there
        clearScene();

        // Display some STLs
        hl.loadDisplayHand(specs.hand,specs.size,specs.design,function(){
            ga('ec:addProduct',GAObjectForSpecs(specs));
            ga('ec:setAction', 'checkout',{
                'step': 1
            });
            ga('send', {
                hitType: 'event',
                eventCategory: 'HandForge',
                eventAction: 'preview',
                eventLabel: window.location.host
            });

            // Defined in setup.js
            render();

            setTimeout(function(){render();},500);
        });
    }

    function downloadHand(){
        ga('ec:addProduct',GAObjectForSpecs(specs));
        ga('ec:setAction', 'checkout_option',{
            'step': 2
        });

        hl.getFiles(specs.hand,specs.size,specs.design,function(files){
            ga('send', {
                hitType: 'event',
                eventCategory: 'HandForge',
                eventAction: 'download',
                eventLabel: window.location.host
            });

            HandZipper.zip(zipFileName(specs),files);
        },function(errors){
            var message = "Some of the files you requested were not available:\n";
            _.each(errors,function(e){
                message += "\n" +e;
            });
            alert(message);

            ga('send', 'exception', {
                'exDescription': "Incomplete_Hand_"+specs.hand + "_" + specs.size,
                'exFatal': false
            });
        });
    }

    function loadReferenceImage(evt) {
		var files = evt.target.files;
        //var filesSelected = ($("#fileItem"))[0].files;
		//var filesSelected = $('input[type=file]').val();
        if (files.length > 0)
        {
            var fileToLoad = files[0];

            if (fileToLoad.type.match("image.*"))
            {
                var fileReader = new FileReader();
                fileReader.onload = function(fileLoadedEvent)
                {
                    var imgPath = fileLoadedEvent.target.result;
                    loadImage(imgPath);
                };
                fileReader.readAsDataURL(fileToLoad);
            }
        }
    }

	// this is called when the user presses the 'Request Design Help' button
	function openDesignRequestURL() {
		// load the url at designRequestURL (found in designs.json) into a new window
		// and focus the browser on that window
		var win = window.open(designRequestURL, '_blank');
		win.focus();
	}

});
