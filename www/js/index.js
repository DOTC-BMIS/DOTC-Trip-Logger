$(function(){
	//window.localStorage.removeItem( 'UserDetails' );
	/*var dotc = new DOTC_TripLogger();
	dotc.LoadForms();
	dotc.LoadCredentials();
	
	$( '#dotc_passengers_button' ).click(function(){
		$( '.dotc_page' ).hide();
		$( '#dotc_passengers' ).show();
	});
	
	$( '#dotc_reports_button' ).click(function(){
		$( '.dotc_page' ).hide();
		$( '#dotc_reports' ).show();
	});
	
	$( '#dotc_stops_button' ).click(function(){
		$( '.dotc_page' ).hide();
		$( '#dotc_stops' ).show();
	});*/
	
	document.addEventListener( "deviceready", function(){	
		var dotc = new DOTC_TripLogger();
		
		var _int = setInterval(function(){
			$( '#dotc_stops' ).after( "<div id='ajax_loader'><img src='img/ajax-loader.gif' /></div>" );
			$( '#dotc_map' ).css({
				width : window.innerWidth + 'px',
				height : window.innerHeight + 'px'
			});
			clearInterval( _int );
		}, 100 );
		
		if ((typeof cordova == 'undefined') && (typeof Cordova == 'undefined')){
			alert('Cordova variable is missing. Check cordova.js included correctly'); 
			
			if( navigator.app ){
				navigator.app.exitApp();
			} else if( navigator.device ) {
				navigator.device.exitApp();
			}
		} else{
			document.addEventListener( "pause", function(){
			
			}, false );
			
			document.addEventListener( "resume", function(){
				
			}, false );
			
			var telephoneNumber = cordova.require("cordova/plugin/telephonenumber");
			telephoneNumber.get(function(result) {
				// console.log("result = " + result);
				// alert( result + ' 1' );
				dotc.phone.number = result;
			}, function(error) {
				// console.log("error = " + error.code);
				// alert( error.code );
			});
			
			if( !dotc.NoInternetConnection() ){
				dotc.LoadForms();
				dotc.LoadCredentials();
				
				$( '#dotc_header_logo' ).click(function(){
					dotc.BackToMap();
				});
				
				$( '#dotc_triplogger' ).click(function(){
					if( dotc.trip_logger.id == 0 ){
						var retVal = prompt( "ENTER PLATE NUMBER ", "" );
						if( retVal != null && retVal.length == 6 && !dotc.NoInternetConnection() ){
							dotc.trip_logger.name = retVal;
							dotc.NewTripLog();
						} else if( retVal != null && retVal.length > 0 ){
							$( '#dotc_triplogger' ).click();
						}
					} else{
						dotc.StopTripLog();
					}
				});
				
				$( '#dotc_passengers_button' ).click(function(){
					$( '.dotc_page' ).hide();
					$( '#dotc_passengers' ).show();
				});
				
				$( '#dotc_reports_button' ).click(function(){
					$( '.dotc_page' ).hide();
					$( '#dotc_reports' ).show();
				});
				
				$( '#dotc_stops_button' ).click(function(){
					$( '.dotc_page' ).hide();
					$( '#dotc_stops' ).show();
				});
				
				document.addEventListener( "backbutton", function(){
					// for buggy forms
					$( '#dotc_footer' ).show();
					
					if( confirm( 'Exit??' ) ){
						if( dotc.trip_logger.id > 0 ){
							dotc.SaveTripLog( true );
						} else{
							if( navigator.app ){
								navigator.app.exitApp();
							} else if( navigator.device ) {
								navigator.device.exitApp();
							}
						}
					}
				}, false );
			} else{
				if( navigator.app ){
					navigator.app.exitApp();
				} else if( navigator.device ) {
					navigator.device.exitApp();
				}
			}
		}
	});
});