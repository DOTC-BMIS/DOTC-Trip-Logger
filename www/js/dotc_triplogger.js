var DOTC_TripLogger = function(){
	this.node_ip = 'http://c2.eacomm.com:3001/';
	// this.node_ip = 'http://192.168.1.36:3000/';
	this.node_lookup = 'http://c2.eacomm.com:3000/';
	this.app_keys = {
		_public : 'f5fd4a451cdc20dc3c62bef36a0d20b658405464',
		_private : '0c5976a31764f7496f058a5cffc6bdb169ec2d8f'
	};
	this.phone = {
		number : '',
		uuid : device.uuid,
		model : device.model,
		platform : device.platform,
		version : device.version
	};
	
	/*this.phone = {
		number : '',
		uuid : '',
		model : '',
		platform : '',
		version : ''
	};*/
	
	this.user = {};
	
	this.map = {
		element : 'dotc_map',
		map : ''
	};
	
	this.position = {
		latitude : 12.553133,
		longitude : 122.277832,
		altitude : '',
		heading : '',
		altitudeAccuracy : '',
		accuracy : '',
		speed : 0,
		watchID : ''
	};
	
	this.userMarker = false;
	
	this.mapOptions = {
		zoom : 6,
		center : new google.maps.LatLng( this.position.latitude, this.position.longitude ),
		mapTypeControl : false,
		panControl : false,
		scaleControl : false,
		streetViewControl : false,
		zoomControlOptions : {
			style : google.maps.ZoomControlStyle.SMALL,
			position : google.maps.ControlPosition.LEFT_CENTER
		}
	};
	
	this.trip_logger = {
		start_marker : false,
		coordinates : [],
		to_send : [],
		id : 0,
		name : '',
		poly : false,
		IntervalTimeout : false,
		vehicleDetails : ''
	};
	
	this._timeoutPosition = '';
}

DOTC_TripLogger.prototype.NoInternetConnection = function( prompt ){
	var network_connection = ( navigator.network.connection.type == Connection.NONE );
	prompt = typeof prompt == 'undefined' ? true : false;
	
	if( network_connection && prompt ){
		alert( 'No Internet Connection' );
	}
	
	return ( network_connection );
}

DOTC_TripLogger.prototype.BackToMap = function(){
	$( '.dotc_close_form' ).eq(0).click();
}

DOTC_TripLogger.prototype.CloseForm = function(){
	var _this = this;
	$( '.dotc_close_form' ).each(function(){
		$( this ).unbind( 'click' ).bind( 'click', function(){
			$( '.dotc_page' ).hide();
			$( '#dotc_map' ).show();
			_this.MapResize();
		});
	});
}

DOTC_TripLogger.prototype.getFormElements = function( container, with_hidden ){
	var ret = {};
	with_hidden = typeof with_hidden == 'undefined' ? false : with_hidden;
	if( typeof container != 'undefined' ){
		$( ( with_hidden ? 'input:hidden, ' : '' ) + 'input:text, input:password, input:checkbox, input:radio, textarea, select', container ).each(function(){
			if( $( this ).attr( 'type' ) == 'checkbox' ){
				ret[$( this ).attr( 'name' )] = $( this ).is( ':checked' ) ? 1 : 0;
			} else{
				ret[$( this ).attr( 'name' )] = $( this ).val();
			}
		});
	}
	
	return ret;
}

DOTC_TripLogger.prototype.LoadForms = function(){
	var _this = this;
	
	$.get(
		_this.node_ip + 'Forms/stops',
		function( data ){
			$( '#dotc_stops' ).html( data );
			$( '#dotc_stops_save_changes_with_photo' ).click(function(){
				navigator.camera.getPicture(function( path ){
					if( !_this.NoInternetConnection() ){
						_this.Loader();
						$.getJSON(
							_this.node_lookup + 'app_FetchVehicle/' + _this.app_keys._public + '/' + _this.trip_logger.name,
							function( data ){
								if( data.response ){
									// save
									var ft = new FileTransfer();
							
									var _params = _this.getFormElements( '#dotc_stops' );
									_params.trip_id = _this.trip_logger.id;
									_params.user_id = _this.user.id;
									_params.latitude = _this.position.latitude;
									_params.longitude = _this.position.longitude;
									_params.plate_no = _this.trip_logger.name;
									
									ft.upload(
										path,
										_this.node_ip + 'SaveStop/1',
										function( data ){
											_this.Loader();
											if( data.response ){
												_this.BackToMap();
											}
										},
										function( error ) {
											alert( 'Error uploading file ' + path + ': ' + error.code );
											_this.Loader();
										},
										{
											fileName: 'picture.jpg',
											params : _params
										}
									);
								} else{
									alert( data.message );
									_this.Loader();
								}
							}
						);
					}
					return false;
				}, function(){
					return false;
				},
					{ 
						quality : 70, 
						destinationType : Camera.DestinationType.FILE_URI, 
						sourceType : Camera.PictureSourceType.CAMERA,
						allowEdit : false,
						saveToPhotoAlbum : true,
						targetWidth : 640,
						targetHeight : 640
					}
				);
			});
			
			$( '#dotc_stops_save_changes' ).click(function(){
				if( !_this.NoInternetConnection() ){
					_this.Loader();
					// save
					$.getJSON(
						_this.node_lookup + 'app_FetchVehicle/' + _this.app_keys._public + '/' + _this.trip_logger.name,
						function( data ){
							if( data.response ){
								// save
								$.post(
									_this.node_ip + 'SaveStop/0',
									{
										trip_id : _this.trip_logger.id,
										user_id : _this.user.id,
										plate_no : _this.trip_logger.name,
										stop_name : $( '#dotc_stops textarea[name=stop_name]' ).val(),
										latitude : _this.position.latitude,
										longitude : _this.position.longitude
									},
									function( data ){
										alert( data.message );
										_this.Loader();
										if( data.response ){
											_this.BackToMap();
										}
									}, 'json'
								);
							} else{
								alert( data.message );
								_this.Loader();
							}
						}
					);
				}
			});
			_this.CloseForm();
		}
	);
	
	$.get(
		_this.node_ip + 'Forms/reports',
		function( data ){
			$( '#dotc_reports' ).html( data );
			$( '#dotc_reports_save_changes_with_photo' ).click(function(){
				navigator.camera.getPicture(function( path ){
					if( !_this.NoInternetConnection() ){
						_this.Loader();
						$.getJSON(
							_this.node_lookup + 'app_FetchVehicle/' + _this.app_keys._public + '/' + _this.trip_logger.name,
							function( data ){
								if( data.response ){
									// save
									var ft = new FileTransfer();
							
									var _params = _this.getFormElements( '#dotc_reports' );
									_params.trip_id = _this.trip_logger.id;
									_params.user_id = _this.user.id;
									_params.latitude = _this.position.latitude;
									_params.longitude = _this.position.longitude;
									_params.plate_no = _this.trip_logger.name;
									
									ft.upload(
										path,
										_this.node_ip + 'SaveIncidentReport/1',
										function( data ){
											_this.Loader();
											if( data.response ){
												_this.BackToMap();
											}
										},
										function( error ) {
											alert( 'Error uploading file ' + path + ': ' + error.code );
											_this.Loader();
										},
										{
											fileName: 'picture.jpg',
											params : _params
										}
									);
								} else{
									alert( data.message );
									_this.Loader();
								}
							}
						);
					}
					return false;
				}, function(){
					return false;
				},
					{ 
						quality : 70, 
						destinationType : Camera.DestinationType.FILE_URI, 
						sourceType : Camera.PictureSourceType.CAMERA,
						allowEdit : false,
						saveToPhotoAlbum : true,
						targetWidth : 640,
						targetHeight : 640
					}
				);
			});
			
			$( '#dotc_reports_save_changes' ).click(function(){
				if( !_this.NoInternetConnection() ){
					_this.Loader();
					// save
					$.getJSON(
						_this.node_lookup + 'app_FetchVehicle/' + _this.app_keys._public + '/' + _this.trip_logger.name,
						function( data ){
							if( data.response ){
								// save
								$.post(
									_this.node_ip + 'SaveIncidentReport/0',
									{
										trip_id : _this.trip_logger.id,
										user_id : _this.user.id,
										plate_no : _this.trip_logger.name,
										description : $( '#dotc_reports textarea[name=description]' ).val(),
										latitude : _this.position.latitude,
										longitude : _this.position.longitude
									},
									function( data ){
										alert( data.message );
										_this.Loader();
										if( data.response ){
											_this.BackToMap();
										}
									}, 'json'
								);
							} else{
								alert( data.message );
								_this.Loader();
							}
						}
					);
				}
			});
			_this.CloseForm();
		}
	);
	
	$.get(
		_this.node_ip + 'Forms/passengers',
		function( data ){
			$( '#dotc_passengers' ).html( data );
			$( '#dotc_passengers_save_changes' ).click(function(){
				if( !_this.NoInternetConnection() ){
					_this.Loader();
					// save
					$.getJSON(
						_this.node_lookup + 'app_FetchVehicle/' + _this.app_keys._public + '/' + _this.trip_logger.name,
						function( data ){
							if( data.response ){
								// save
								$.post(
									_this.node_ip + 'SavePassengersVolume',
									{
										trip_id : _this.trip_logger.id,
										user_id : _this.user.id,
										plate_no : _this.trip_logger.name,
										volume : $( '#dotc_passengers select[name=volume]' ).val(),
										latitude : _this.position.latitude,
										longitude : _this.position.longitude
									},
									function( data ){
										alert( data.message );
										_this.Loader();
										if( data.response ){
											_this.BackToMap();
										}
									}, 'json'
								);
							} else{
								alert( data.message );
								_this.Loader();
							}
						}
					);
				}
			});
			_this.CloseForm();
		}
	);
}

DOTC_TripLogger.prototype.StopTripLog = function(){
	this.trip_logger.start_marker.setMap( null );
	this.trip_logger.poly.setMap( null );
	clearInterval( this.trip_logger.IntervalTimeout );
	this.SaveTripLog();
	
	this.trip_logger = {
		start_marker : false,
		coordinates : [],
		to_send : [],
		id : 0,
		name : '',
		poly : false,
		IntervalTimeout : false,
		vehicleDetails : ''
	};
	this.TripLogText();
	this.PlateNos();
	this.SomeVehicleInfo();
	$( '#dotc_footer a' ).css({
		visibility : 'hidden'
	});
	this.BackToMap();
	alert( 'Trip Logger Stopped' );
}

DOTC_TripLogger.prototype.SaveTripLog = function( exitApp ){
	var _this = this;
	var exitApp = typeof exitApp == 'undefined' ? false : true;
	if( this.trip_logger.to_send.length > 0 && !_this.NoInternetConnection( false ) ){
		$.post(
			_this.node_ip + 'SaveTripLog',
			{
				id : _this.trip_logger.id,
				user_id : _this.user.id,
				trip_name : _this.trip_logger.name,
				coordinates : _this.trip_logger.to_send
			}, function( data ){
				if( exitApp ){
					_this.Loader();
					if( navigator.app ){
						navigator.app.exitApp();
					} else if( navigator.device ) {
						navigator.device.exitApp();
					}
				}
			}
		);
		_this.trip_logger.to_send = [];
	}
}

DOTC_TripLogger.prototype.TripLogTrail = function(){
	var _this = this;
	_this.trip_logger.IntervalTimeout = setInterval(function(){
		var _last = _this.trip_logger.coordinates[( _this.trip_logger.coordinates.length - 1 )];
		var _location = new google.maps.LatLng( _this.position.latitude, _this.position.longitude );
		var path = _this.trip_logger.poly.getPath();
		path.push( _location );
		
		/*var m_position = _this.position;
		m_position.watchID = '';
		_this.trip_logger.coordinates.push( m_position );
		_this.trip_logger.to_send.push( m_position );*/
		
		// every minute
		if( _this.trip_logger.to_send.length >= 60 ){
			_this.SaveTripLog();
		}
	}, 1000 );
}

DOTC_TripLogger.prototype.TripLogText = function(){
	var _text = $( '#dotc_triplogger' ).text().toLowerCase();
	
	if( this.trip_logger.id > 0 ){
		/*$( '#dotc_triplogger' ).text( 'STOP' ).css({
			color : 'red'
		});*/
		$( '#dotc_triplogger img' ).attr( 'src', 'img/end-h35.png' );
	} else{
		/*$( '#dotc_triplogger' ).text( 'START' ).css({
			color : 'blue'
		});*/
		$( '#dotc_triplogger img' ).attr( 'src', 'img/start-h35.png' );
	}
}

DOTC_TripLogger.prototype.PlateNos = function( option ){
	option = typeof option == 'undefined' ? true : false;
	
	if( option ){
		$( '.dotc_plate_no' ).attr( 'disabled', true ).val( this.trip_logger.name );
	} else{
		$( '.dotc_plate_no' ).removeAttr( 'disabled' ).val( this.trip_logger.name );
	}
}

DOTC_TripLogger.prototype.NewTripLogStart = function(){
	var _this = this;
	if( !_this.trip_logger.start_marker ){
		var _location = new google.maps.LatLng( _this.position.latitude, _this.position.longitude );
		_this.trip_logger.start_marker = new google.maps.Marker({
			position :  _location,
			map : _this.map.map,
			title : 'Start Marker'
		});
		
		var m_position = _this.position;
		m_position.watchID = '';
		_this.map.map.setCenter( _location );
		_this.trip_logger.coordinates.push( m_position );
		_this.trip_logger.to_send.push( m_position );
		_this.trip_logger.poly = new google.maps.Polyline({
			strokeColor : '#000000',
			strokeOpacity : 1.0,
			strokeWeight : 3
		});
		_this.trip_logger.poly.setMap( _this.map.map );
		var path = _this.trip_logger.poly.getPath();
		path.push( _location );
		_this.TripLogTrail();
		_this.TripLogText();
		_this.PlateNos();
		_this.SomeVehicleInfo();
		$( '#dotc_footer a' ).css({
			visibility : 'visible'
		});
	}
}

DOTC_TripLogger.prototype.SomeVehicleInfo = function(){
	if( $( '#dotc_vehicle_info' ).is( ':visible' ) ){
		$( '#dotc_vehicle_info' ).fadeOut( 500, function(){
			$( '#dotc_vehicle_info' ).html( '' );
		});
	} else{
		$( '#dotc_vehicle_info' ).html( this.trip_logger.vehicleDetails ).fadeIn( 500 );
	}
}

DOTC_TripLogger.prototype.LoaderOpenClose = function( option ){
	option = typeof option == 'undefined' ? true : false;
	if( option ){
		$( '#ajax_loader' ).show();
	} else{
		$( '#ajax_loader' ).hide();
	}
}

DOTC_TripLogger.prototype.NewTripLog = function(){
	var _this = this;
	this.Loader();
	
	$.getJSON(
		_this.node_lookup + 'app_FetchVehicle/' + _this.app_keys._public + '/' + _this.trip_logger.name
	).done(function( data ){
		var colorum = 0;
	
		if( !data.response ){
			// alert( data.message );
			colorum = 1;
			_this.trip_logger.vehicleDetails = 'You are riding ' + _this.trip_logger.name.toUpperCase();
		} else{
			_this.trip_logger.vehicleDetails = 'You are riding ' + _this.trip_logger.name.toUpperCase() + '<br />' + data.result.name + '<br />' + data.result.route;
		}
	
		$.post(
			_this.node_ip + 'NewTripLog',
			{
				user : _this.user.id,
				name : _this.trip_logger.name,
				possible_colorum : colorum
			}, function( _data ){
				if( _data.response ){
					_this.trip_logger.id = _data.id;
					_this.NewTripLogStart();
				}
				
				_this.Loader();
			}, 'json'
		);
	});
}

DOTC_TripLogger.prototype.DetectBrowser = function(){
	var useragent = navigator.userAgent;
	var mapdiv = document.getElementById( this.map.element );

	if(
		useragent.indexOf( 'iPhone' ) != -1
		|| useragent.indexOf( 'Android' ) != -1
	){
		mapdiv.style.width = '100%';
		mapdiv.style.height = '100%';
	}else {
		mapdiv.style.width = '600px';
		mapdiv.style.height = '800px';
	}
}

DOTC_TripLogger.prototype.LoadMapOptions = function( options ){
	if( typeof options != 'undefined' ){
		this.mapOptions = $.extend( this.mapOptions, options );
	}
}

DOTC_TripLogger.prototype.LoadMap = function( options ){
	if( typeof options != 'undefined' ){
		this.map = $.extend( this.map, options );
	}
	
	$( '#' + this.map.element ).css({
		width : $( document ).width() + 'px',
		height : $( document ).height() + 'px'
	});
	
	this.map.map = new google.maps.Map( document.getElementById( this.map.element ), this.mapOptions );
	
	this.MapResize();
	
	this.CurrentPosition();
}

DOTC_TripLogger.prototype.MapResize = function(){
	google.maps.event.trigger( this.map.map, 'resize' );
}

DOTC_TripLogger.prototype.WatchPosition = function(){
	var options = { maximumAge: 3000, timeout: 5000, enableHighAccuracy: true };
	var _this = this;
    this.position.watchID = navigator.geolocation.watchPosition( function( position ){
		_this.position.latitude = position.coords.latitude;
		_this.position.longitude = position.coords.longitude;
		_this.position.altitude = position.coords.altitude;
        _this.position.accuracy = position.coords.accuracy;
        _this.position.altitudeAccuracy = position.coords.altitudeAccuracy;
        _this.position.heading = position.coords.heading;
        _this.position.speed = position.coords.speed;
		
		if( _this.trip_logger.id > 0 ){
			var m_position = _this.position;
			m_position.watchID = '';
			_this.trip_logger.coordinates.push( m_position );
			_this.trip_logger.to_send.push( m_position );
		}
	}, function(){
		
	}, options );
}

DOTC_TripLogger.prototype.CurrentPosition = function(){
	var _this = this;
	this._timeoutPosition = setInterval(function(){
		var _location = new google.maps.LatLng( _this.position.latitude, _this.position.longitude );
		if( _this.userMarker ){
			_this.userMarker.setPosition( _location );
		} else{
			_this.userMarker = new google.maps.Marker({
				position :  _location,
				map : _this.map.map,
				title : 'Patootie'
			});
			_this.map.map.setZoom( 13 );
		}
		_this.map.map.setCenter( _location );
	}, 1000 );
}

DOTC_TripLogger.prototype.Loader = function(){
	if( $( '#ajax_loader' ).is( ':visible' ) ){
		$( '#ajax_loader' ).hide();
	} else{
		$( '#ajax_loader' ).show();
	}
}

DOTC_TripLogger.prototype.ValidateRegistration = function( _details ){
	try{
		if( $( 'input[name=fname]', _details ).val().length == 0 ){
			throw "Firstname is empty";
		}
		
		if( $( 'input[name=lname]', _details ).val().length == 0 ){
			throw "Lastname is empty";
		}
		
		if( $( 'input[name=email]', _details ).val().length == 0 ){
			throw "Email Address is empty";
		}
		
		if( $( 'input[name=password]', _details ).val().length == 0 ){
			// throw "Password is empty";
		}
		
		return true;
	} catch( err ){
		alert( err );
		
		return false;
	}
}

DOTC_TripLogger.prototype.ClearForm = function( _form ){
	$( 'input:text, input:password, textarea, select', _form ).val( '' );
}

DOTC_TripLogger.prototype.CheckLocalStore = function( label ){
	return window.localStorage.getItem( label );
}

DOTC_TripLogger.prototype.LocalStore = function( label, data ){
	window.localStorage.setItem( label, data );
}

DOTC_TripLogger.prototype.NeedsRegistration = function(){
	var _this = this;
	var user_store = _this.CheckLocalStore( 'UserDetails' );
	if( user_store == null ){
		$( '#' + _this.map.element ).hide();
		$( '#dotc_registration' ).show();
		$( '#dotc_footer, #dotc_triplogger' ).hide();
		$.get(
			_this.node_ip + 'RegistrationForm',
			function( data ){
				$( '#dotc_registration_form' ).submit(function( e ){
					e.preventDefault();
				}).html( data )
				.find( 'input[name=phone_uuid]' ).val( _this.phone.uuid ).end()
				.find( 'input[name=phone_no]' ).val( _this.phone.number );
				$( '#dotc_registration_save_changes' ).click(function(){
					if( !_this.NoInternetConnection() ){
						if( _this.ValidateRegistration( $( '#dotc_registration_form' ) ) ){
							if( typeof FormData == 'undefined' ){
								var _formData = {};
								
								$( 'input,select,textarea', '#dotc_registration_form' ).each(function(){
									_formData[$( this ).attr( 'name' )] = $( this ).val();
								});
								
								$.post(
									_this.node_ip + 'RegistrationSaveChanges_V2',
									_formData,
									function( data ){
										alert( data.messages.join( '' ) );
										
										if( +data.errors == 0 ){
											_this.ClearForm( $( '#dotc_registration_form' ) );
											
											_this.user = data.user;
											_this.LocalStore( 'UserDetails', _this.user );
											
											$( '#dotc_registration' ).hide();
											$( '#dotc_footer, #dotc_triplogger' ).show();
											$( '#' + _this.map.element ).show();
											_this.MapResize();
										}
									}, 'json'
								);
							} else{
								var _formData = new FormData( $( '#dotc_registration_form' )[0] );
								
								$.ajax({
									url : _this.node_ip + 'RegistrationSaveChanges',
									type : 'POST',
									data : _formData,
									async : false,
									cache : false,
									contentType : false,
									processData : false,
									enctype: "multipart/form-data",
									success : function( data ){
										alert( data.messages.join( '' ) );
										
										if( +data.errors == 0 ){
											_this.ClearForm( $( '#dotc_registration_form' ) );
											
											_this.user = data.user;
											_this.LocalStore( 'UserDetails', _this.user );
											
											$( '#dotc_registration' ).hide();
											$( '#dotc_footer, #dotc_triplogger' ).show();
											$( '#' + _this.map.element ).show();
											_this.MapResize();
										}
									}
								});
							}
						}
					}
				});
			}
		);
	}
	this.Loader();
}

DOTC_TripLogger.prototype.CheckIfUserLogged = function(){
	var _this = this;
	
	$.post(
		_this.node_ip + 'checkUser',
		{
			phone_number : _this.phone.number,
			uuid : _this.phone.uuid
		}, function( data ){
			_this.user = data.data;
			
			if( Object.keys( _this.user ).length > 0 ){
				_this.LocalStore( 'UserDetails', _this.user );
				
				$( '#dotc_footer' ).removeClass( 'hidden' ).show();
			}
			
			_this.NeedsRegistration();
		}, 'json'
	);
}

DOTC_TripLogger.prototype.LoadCredentials = function(){
	this.CheckIfUserLogged();
	this.WatchPosition();
	this.LoadMap();
}