if (typeof Number.prototype.toPrecisionFixed == 'undefined') {
  Number.prototype.toPrecisionFixed = function(precision) {
    
    // use standard toPrecision method
    var n = this.toPrecision(precision);
    
    // ... but replace +ve exponential format with trailing zeros
    n = n.replace(/(.+)e\+(.+)/, function(n, sig, exp) {
      sig = sig.replace(/\./, '');       // remove decimal from significand
      l = sig.length - 1;
      while (exp-- > l) sig = sig + '0'; // append zeros from exponent
      return sig;
    });
    
    // ... and replace -ve exponential format with leading zeros
    n = n.replace(/(.+)e-(.+)/, function(n, sig, exp) {
      sig = sig.replace(/\./, '');       // remove decimal from significand
      while (exp-- > 1) sig = '0' + sig; // prepend zeros from exponent
      return '0.' + sig;
    });
    
    return n;
  }
}

var DOTC_TripLogger = function(){
	this.node_ip = 'http://c3.eacomm.com:3001/';
	// this.node_ip = 'http://192.168.1.36:3000/';
	this.node_lookup = 'http://c3.eacomm.com:3000/';
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
		watchID : '',
		timestamp : '',
		current_dt : ''
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
		vehicleDetails : '',
		server_time : '',
		send_limit : 60
	};
	
	this.timezone = 'Asia/Manila';
	this.dateformat = 'YYYY-MM-DD HH:mm:ss';
	
	// var C_TIMESTAMP = new Date().getTime();
	var C_TIMESTAMP = moment().format( 'X' );
	
	this.running_time = {
		seconds : 0,
		timestamp : C_TIMESTAMP,
		ticker : false,
		// datetime : this.date( 'Y-m-d G:i:s', C_TIMESTAMP )
		datetime : moment().format( this.format )
	};
	
	this._timeoutPosition = '';
	
	this.saveAjax = false;
	
	this.LoggerTicker();
	
	this.batchSend = [];
	this.batchSendCtr = 0;
	this.batchSendSent = 0;
	this.batchSentCtr = 0;
	this.SpeedLimit = 200;
	this.DistanceLimit = 0.60;
	this.CurrentDistance = 0;
	this.CurrentSpeed = 0;
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
		vehicleDetails : '',
		server_time : '',
		ticker : false,
		send_limit : 60
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

DOTC_TripLogger.prototype.BATCHSEND = function(){
	var _this = this;
	setInterval(function(){
		if( _this.batchSend.length > 0 ){
			// alert( _this.batchSend.length + ' - ' + _this.batchSend[Object.keys( _this.batchSend )[0]].length + ' ' + Object.keys( _this.batchSend ) );
			if( _this.saveAjax ){
				_this.saveAjax.abort();
			}
			var _iSend = _this.batchSend[Object.keys( _this.batchSend )[0]];
			
			_this.saveAjax = $.post(
				_this.node_ip + 'SaveTripLog',
				{
					id : _iSend.id,
					user_id : _iSend.user_id,
					trip_name : _iSend.trip_name,
					coordinates : _iSend.data
				}, function( data ){
					_this.batchSentCtr++;
					
					var _key = Object.keys( _this.batchSend )[0];
					delete _this.batchSend[_key];
					if( _this.batchSend.indexOf( _key ) > - 1 ){
						_this.batchSend.splice( _this.batchSend.indexOf( _key ), 1 );
					}
				}
			);
		}
	}, 10000 );
}

DOTC_TripLogger.prototype.SaveTripLog = function( exitApp ){
	var _this = this;
	var exitApp = typeof exitApp == 'undefined' ? false : true;
	if( this.trip_logger.to_send.length > 0 && !_this.NoInternetConnection( false ) ){
		/*if( this.saveAjax ){
			this.trip_logger.send_limit += 60;
			this.saveAjax.abort();
		}*/
		
		_this.batchSend[_this.batchSendCtr] = {
			data : _this.trip_logger.to_send,
			id : _this.trip_logger.id,
			user_id : _this.user.id,
			trip_name : _this.trip_logger.name
		};
		_this.batchSendCtr++;
		_this.trip_logger.to_send = [];
	
		/*this.saveAjax = $.post(
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
					// _this.LoggerTicker( false );
				}
				_this.trip_logger.coordinates = [];
				_this.trip_logger.to_send = [];
				_this.trip_logger.send_limit = 60;
			}
		);*/
	}
}

DOTC_TripLogger.prototype.DistanceTo = function(point_a, point_b, poprecision) {
  // default 4 sig figs reflects typical 0.3% accuracy of spherical model
  if (typeof precision == 'undefined') precision = 4;
  
  var R = 6371;
  // var lat1 = this._lat.toRad(), lon1 = this._lon.toRad();
  // var lat2 = point._lat.toRad(), lon2 = point._lon.toRad();
  var lat1 = point_a._lat * Math.PI / 180, lon1 = point_a._lon * Math.PI / 180;
  var lat2 = point_b._lat * Math.PI / 180, lon2 = point_b._lon * Math.PI / 180;
  var dLat = lat2 - lat1;
  var dLon = lon2 - lon1;

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1) * Math.cos(lat2) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  var d = R * c;
  
  return d.toPrecisionFixed( precision );
}

DOTC_TripLogger.prototype.TripLogTrail = function(){
	var _this = this;
	_this.trip_logger.IntervalTimeout = setInterval(function(){
		var _last = _this.trip_logger.coordinates[( _this.trip_logger.coordinates.length - 1 )];
		var m_position = {
			latitude : _this.position.latitude,
			longitude : _this.position.longitude,
			accuracy : _this.position.accuracy,
			altitudeAccuracy : _this.position.altitudeAccuracy,
			heading : _this.position.heading,
			speed : _this.position.speed,
			timestamp : moment().format( 'X' ),
			seconds : _this.running_time.seconds,
			current_dt : moment( _this.running_time.datetime ).add( _this.running_time.seconds, 's' ).format( _this.dateformat ),
			watchID : ''
		};
		
		_this.CurrentDistance = _this.DistanceTo(
			{
				_lat : _last.latitude,
				_lon : _last.longitude
			},
			{
				_lat : _this.position.latitude,
				_lon : _this.position.longitude
			}
		);
		
		_this.CurrentSpeed = ( _this.CurrentDistance / ( +moment( m_position.current_dt ).subtract( _last.current_dt, 's' ).seconds() / 3600 ) ).toPrecisionFixed( 7 );
		
		if(
			!isNaN( _this.CurrentSpeed )
			&& _this.CurrentSpeed <= _this.SpeedLimit
		){
			var _location = new google.maps.LatLng( _this.position.latitude, _this.position.longitude );
			var path = _this.trip_logger.poly.getPath();
			path.push( _location );
			
			if( _this.trip_logger.id > 0 ){
				m_position.estimated_distance = _this.CurrentDistance;
				m_position.estimated_speed = _this.CurrentSpeed;
				_this.trip_logger.coordinates.push( m_position );
				_this.trip_logger.to_send.push( m_position );
				
				// every minute
				if( _this.trip_logger.to_send.length >= _this.trip_logger.send_limit ){
					_this.SaveTripLog();
				}
			}
		}
		
		/*navigator.geolocation.getCurrentPosition(function( position ){
			var m_position = {
				latitude : position.coords.latitude,
				longitude : position.coords.longitude,
				accuracy : position.coords.accuracy,
				altitudeAccuracy : position.coords.altitudeAccuracy,
				heading : position.coords.heading,
				speed : position.coords.speed,
				timestamp : moment().format( 'X' ),
				seconds : _this.running_time.seconds,
				current_dt : moment( _this.running_time.datetime ).add( _this.running_time.seconds, 's' ).format( _this.dateformat ),
				watchID : ''
			};
			
			_this.trip_logger.coordinates.push( m_position );
			_this.trip_logger.to_send.push( m_position );
			
			// every minute
			if( _this.trip_logger.to_send.length >= _this.trip_logger.send_limit ){
				_this.SaveTripLog();
			}
		}, function(){
		
		}, { maximumAge: 3000, timeout: 5000, enableHighAccuracy: true });*/
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
		m_position.timestamp = moment().format( 'X' );
		m_position.seconds = _this.running_time.seconds;
		m_position.current_dt = moment( _this.running_time.datetime ).add( _this.running_time.seconds, 's' ).format( _this.dateformat );
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

DOTC_TripLogger.prototype.LoggerTicker = function( tick ){
	tick = typeof tick == 'undefined' ? true : false;
	var _this = this;
	
	if( tick ){
		this.running_time.ticker = setInterval(function(){
			_this.running_time.seconds++;
		}, 1000 );
	} else{
		clearInterval( this.running_time.ticker );
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
		var _d = new Date();
		_this.position.latitude = position.coords.latitude;
		_this.position.longitude = position.coords.longitude;
		_this.position.altitude = position.coords.altitude;
        _this.position.accuracy = position.coords.accuracy;
        _this.position.altitudeAccuracy = position.coords.altitudeAccuracy;
        _this.position.heading = position.coords.heading;
        _this.position.speed = position.coords.speed;
		_this.position.timestamp = moment().format( 'X' );
		_this.position.seconds = _this.running_time.seconds;
		_this.position.current_dt = moment( _this.running_time.datetime ).add( _this.running_time.seconds, 's' ).format( _this.dateformat );
		
		/*if( _this.trip_logger.id > 0 ){
			var m_position = _this.position;
			m_position.watchID = '';
			_this.trip_logger.coordinates.push( m_position );
			_this.trip_logger.to_send.push( m_position );
		}*/
	}, function(){
		
	}, options );
}

DOTC_TripLogger.prototype.CurrentPosition = function(){
	var _this = this;
	this._timeoutPosition = setInterval(function(){
		$( '#current_coordinates' ).html( _this.position.latitude + ', ' + _this.position.longitude + ' (' + _this.batchSentCtr + '/' + _this.batchSendCtr + ') (' + _this.CurrentDistance + ' - ' + ( !isNaN( _this.CurrentSpeed ) ? _this.CurrentSpeed : '0.00' ) + 'kph)' );
	
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

// from phpjs.org
DOTC_TripLogger.prototype.strtotime = function(text, now) {
  //  discuss at: http://phpjs.org/functions/strtotime/
  //     version: 1109.2016
  // original by: Caio Ariede (http://caioariede.com)
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Caio Ariede (http://caioariede.com)
  // improved by: A. Matías Quezada (http://amatiasq.com)
  // improved by: preuter
  // improved by: Brett Zamir (http://brett-zamir.me)
  // improved by: Mirko Faber
  //    input by: David
  // bugfixed by: Wagner B. Soares
  // bugfixed by: Artur Tchernychev
  //        note: Examples all have a fixed timestamp to prevent tests to fail because of variable time(zones)
  //   example 1: strtotime('+1 day', 1129633200);
  //   returns 1: 1129719600
  //   example 2: strtotime('+1 week 2 days 4 hours 2 seconds', 1129633200);
  //   returns 2: 1130425202
  //   example 3: strtotime('last month', 1129633200);
  //   returns 3: 1127041200
  //   example 4: strtotime('2009-05-04 08:30:00 GMT');
  //   returns 4: 1241425800

  var parsed, match, today, year, date, days, ranges, len, times, regex, i, fail = false;

  if (!text) {
    return fail;
  }

  // Unecessary spaces
  text = text.replace(/^\s+|\s+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\t\r\n]/g, '')
    .toLowerCase();

  // in contrast to php, js Date.parse function interprets:
  // dates given as yyyy-mm-dd as in timezone: UTC,
  // dates with "." or "-" as MDY instead of DMY
  // dates with two-digit years differently
  // etc...etc...
  // ...therefore we manually parse lots of common date formats
  match = text.match(
    /^(\d{1,4})([\-\.\/\:])(\d{1,2})([\-\.\/\:])(\d{1,4})(?:\s(\d{1,2}):(\d{2})?:?(\d{2})?)?(?:\s([A-Z]+)?)?$/);

  if (match && match[2] === match[4]) {
    if (match[1] > 1901) {
      switch (match[2]) {
      case '-':
        {
          // YYYY-M-D
          if (match[3] > 12 || match[5] > 31) {
            return fail;
          }

          return new Date(match[1], parseInt(match[3], 10) - 1, match[5],
            match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
        }
      case '.':
        {
          // YYYY.M.D is not parsed by strtotime()
          return fail;
        }
      case '/':
        {
          // YYYY/M/D
          if (match[3] > 12 || match[5] > 31) {
            return fail;
          }

          return new Date(match[1], parseInt(match[3], 10) - 1, match[5],
            match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
        }
      }
    } else if (match[5] > 1901) {
      switch (match[2]) {
      case '-':
        {
          // D-M-YYYY
          if (match[3] > 12 || match[1] > 31) {
            return fail;
          }

          return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
            match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
        }
      case '.':
        {
          // D.M.YYYY
          if (match[3] > 12 || match[1] > 31) {
            return fail;
          }

          return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
            match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
        }
      case '/':
        {
          // M/D/YYYY
          if (match[1] > 12 || match[3] > 31) {
            return fail;
          }

          return new Date(match[5], parseInt(match[1], 10) - 1, match[3],
            match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
        }
      }
    } else {
      switch (match[2]) {
      case '-':
        {
          // YY-M-D
          if (match[3] > 12 || match[5] > 31 || (match[1] < 70 && match[1] > 38)) {
            return fail;
          }

          year = match[1] >= 0 && match[1] <= 38 ? +match[1] + 2000 : match[1];
          return new Date(year, parseInt(match[3], 10) - 1, match[5],
            match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
        }
      case '.':
        {
          // D.M.YY or H.MM.SS
          if (match[5] >= 70) {
            // D.M.YY
            if (match[3] > 12 || match[1] > 31) {
              return fail;
            }

            return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
              match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
          }
          if (match[5] < 60 && !match[6]) {
            // H.MM.SS
            if (match[1] > 23 || match[3] > 59) {
              return fail;
            }

            today = new Date();
            return new Date(today.getFullYear(), today.getMonth(), today.getDate(),
              match[1] || 0, match[3] || 0, match[5] || 0, match[9] || 0) / 1000;
          }

          // invalid format, cannot be parsed
          return fail;
        }
      case '/':
        {
          // M/D/YY
          if (match[1] > 12 || match[3] > 31 || (match[5] < 70 && match[5] > 38)) {
            return fail;
          }

          year = match[5] >= 0 && match[5] <= 38 ? +match[5] + 2000 : match[5];
          return new Date(year, parseInt(match[1], 10) - 1, match[3],
            match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
        }
      case ':':
        {
          // HH:MM:SS
          if (match[1] > 23 || match[3] > 59 || match[5] > 59) {
            return fail;
          }

          today = new Date();
          return new Date(today.getFullYear(), today.getMonth(), today.getDate(),
            match[1] || 0, match[3] || 0, match[5] || 0) / 1000;
        }
      }
    }
  }

  // other formats and "now" should be parsed by Date.parse()
  if (text === 'now') {
    return now === null || isNaN(now) ? new Date()
      .getTime() / 1000 | 0 : now | 0;
  }
  if (!isNaN(parsed = Date.parse(text))) {
    return parsed / 1000 | 0;
  }

  date = now ? new Date(now * 1000) : new Date();
  days = {
    'sun': 0,
    'mon': 1,
    'tue': 2,
    'wed': 3,
    'thu': 4,
    'fri': 5,
    'sat': 6
  };
  ranges = {
    'yea': 'FullYear',
    'mon': 'Month',
    'day': 'Date',
    'hou': 'Hours',
    'min': 'Minutes',
    'sec': 'Seconds'
  };

  function lastNext(type, range, modifier) {
    var diff, day = days[range];

    if (typeof day !== 'undefined') {
      diff = day - date.getDay();

      if (diff === 0) {
        diff = 7 * modifier;
      } else if (diff > 0 && type === 'last') {
        diff -= 7;
      } else if (diff < 0 && type === 'next') {
        diff += 7;
      }

      date.setDate(date.getDate() + diff);
    }
  }

  function process(val) {
    var splt = val.split(' '), // Todo: Reconcile this with regex using \s, taking into account browser issues with split and regexes
      type = splt[0],
      range = splt[1].substring(0, 3),
      typeIsNumber = /\d+/.test(type),
      ago = splt[2] === 'ago',
      num = (type === 'last' ? -1 : 1) * (ago ? -1 : 1);

    if (typeIsNumber) {
      num *= parseInt(type, 10);
    }

    if (ranges.hasOwnProperty(range) && !splt[1].match(/^mon(day|\.)?$/i)) {
      return date['set' + ranges[range]](date['get' + ranges[range]]() + num);
    }

    if (range === 'wee') {
      return date.setDate(date.getDate() + (num * 7));
    }

    if (type === 'next' || type === 'last') {
      lastNext(type, range, num);
    } else if (!typeIsNumber) {
      return false;
    }

    return true;
  }

  times = '(years?|months?|weeks?|days?|hours?|minutes?|min|seconds?|sec' +
    '|sunday|sun\\.?|monday|mon\\.?|tuesday|tue\\.?|wednesday|wed\\.?' +
    '|thursday|thu\\.?|friday|fri\\.?|saturday|sat\\.?)';
  regex = '([+-]?\\d+\\s' + times + '|' + '(last|next)\\s' + times + ')(\\sago)?';

  match = text.match(new RegExp(regex, 'gi'));
  if (!match) {
    return fail;
  }

  for (i = 0, len = match.length; i < len; i++) {
    if (!process(match[i])) {
      return fail;
    }
  }

  // ECMAScript 5 only
  // if (!match.every(process))
  //    return false;

  return (date.getTime() / 1000);
}

DOTC_TripLogger.prototype.date = function(format, timestamp) {
  //  discuss at: http://phpjs.org/functions/date/
  // original by: Carlos R. L. Rodrigues (http://www.jsfromhell.com)
  // original by: gettimeofday
  //    parts by: Peter-Paul Koch (http://www.quirksmode.org/js/beat.html)
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: MeEtc (http://yass.meetcweb.com)
  // improved by: Brad Touesnard
  // improved by: Tim Wiel
  // improved by: Bryan Elliott
  // improved by: David Randall
  // improved by: Theriault
  // improved by: Theriault
  // improved by: Brett Zamir (http://brett-zamir.me)
  // improved by: Theriault
  // improved by: Thomas Beaucourt (http://www.webapp.fr)
  // improved by: JT
  // improved by: Theriault
  // improved by: Rafal Kukawski (http://blog.kukawski.pl)
  // improved by: Theriault
  //    input by: Brett Zamir (http://brett-zamir.me)
  //    input by: majak
  //    input by: Alex
  //    input by: Martin
  //    input by: Alex Wilson
  //    input by: Haravikk
  // bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // bugfixed by: majak
  // bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // bugfixed by: Brett Zamir (http://brett-zamir.me)
  // bugfixed by: omid (http://phpjs.org/functions/380:380#comment_137122)
  // bugfixed by: Chris (http://www.devotis.nl/)
  //        note: Uses global: php_js to store the default timezone
  //        note: Although the function potentially allows timezone info (see notes), it currently does not set
  //        note: per a timezone specified by date_default_timezone_set(). Implementers might use
  //        note: this.php_js.currentTimezoneOffset and this.php_js.currentTimezoneDST set by that function
  //        note: in order to adjust the dates in this function (or our other date functions!) accordingly
  //   example 1: date('H:m:s \\m \\i\\s \\m\\o\\n\\t\\h', 1062402400);
  //   returns 1: '09:09:40 m is month'
  //   example 2: date('F j, Y, g:i a', 1062462400);
  //   returns 2: 'September 2, 2003, 2:26 am'
  //   example 3: date('Y W o', 1062462400);
  //   returns 3: '2003 36 2003'
  //   example 4: x = date('Y m d', (new Date()).getTime()/1000);
  //   example 4: (x+'').length == 10 // 2009 01 09
  //   returns 4: true
  //   example 5: date('W', 1104534000);
  //   returns 5: '53'
  //   example 6: date('B t', 1104534000);
  //   returns 6: '999 31'
  //   example 7: date('W U', 1293750000.82); // 2010-12-31
  //   returns 7: '52 1293750000'
  //   example 8: date('W', 1293836400); // 2011-01-01
  //   returns 8: '52'
  //   example 9: date('W Y-m-d', 1293974054); // 2011-01-02
  //   returns 9: '52 2011-01-02'

  var that = this;
  var jsdate, f;
  // Keep this here (works, but for code commented-out below for file size reasons)
  // var tal= [];
  var txt_words = [
    'Sun', 'Mon', 'Tues', 'Wednes', 'Thurs', 'Fri', 'Satur',
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  // trailing backslash -> (dropped)
  // a backslash followed by any character (including backslash) -> the character
  // empty string -> empty string
  var formatChr = /\\?(.?)/gi;
  var formatChrCb = function (t, s) {
    return f[t] ? f[t]() : s;
  };
  var _pad = function (n, c) {
    n = String(n);
    while (n.length < c) {
      n = '0' + n;
    }
    return n;
  };
  f = {
    // Day
    d: function () {
      // Day of month w/leading 0; 01..31
      return _pad(f.j(), 2);
    },
    D: function () {
      // Shorthand day name; Mon...Sun
      return f.l()
        .slice(0, 3);
    },
    j: function () {
      // Day of month; 1..31
      return jsdate.getDate();
    },
    l: function () {
      // Full day name; Monday...Sunday
      return txt_words[f.w()] + 'day';
    },
    N: function () {
      // ISO-8601 day of week; 1[Mon]..7[Sun]
      return f.w() || 7;
    },
    S: function () {
      // Ordinal suffix for day of month; st, nd, rd, th
      var j = f.j();
      var i = j % 10;
      if (i <= 3 && parseInt((j % 100) / 10, 10) == 1) {
        i = 0;
      }
      return ['st', 'nd', 'rd'][i - 1] || 'th';
    },
    w: function () {
      // Day of week; 0[Sun]..6[Sat]
      return jsdate.getDay();
    },
    z: function () {
      // Day of year; 0..365
      var a = new Date(f.Y(), f.n() - 1, f.j());
      var b = new Date(f.Y(), 0, 1);
      return Math.round((a - b) / 864e5);
    },

    // Week
    W: function () {
      // ISO-8601 week number
      var a = new Date(f.Y(), f.n() - 1, f.j() - f.N() + 3);
      var b = new Date(a.getFullYear(), 0, 4);
      return _pad(1 + Math.round((a - b) / 864e5 / 7), 2);
    },

    // Month
    F: function () {
      // Full month name; January...December
      return txt_words[6 + f.n()];
    },
    m: function () {
      // Month w/leading 0; 01...12
      return _pad(f.n(), 2);
    },
    M: function () {
      // Shorthand month name; Jan...Dec
      return f.F()
        .slice(0, 3);
    },
    n: function () {
      // Month; 1...12
      return jsdate.getMonth() + 1;
    },
    t: function () {
      // Days in month; 28...31
      return (new Date(f.Y(), f.n(), 0))
        .getDate();
    },

    // Year
    L: function () {
      // Is leap year?; 0 or 1
      var j = f.Y();
      return j % 4 === 0 & j % 100 !== 0 | j % 400 === 0;
    },
    o: function () {
      // ISO-8601 year
      var n = f.n();
      var W = f.W();
      var Y = f.Y();
      return Y + (n === 12 && W < 9 ? 1 : n === 1 && W > 9 ? -1 : 0);
    },
    Y: function () {
      // Full year; e.g. 1980...2010
      return jsdate.getFullYear();
    },
    y: function () {
      // Last two digits of year; 00...99
      return f.Y()
        .toString()
        .slice(-2);
    },

    // Time
    a: function () {
      // am or pm
      return jsdate.getHours() > 11 ? 'pm' : 'am';
    },
    A: function () {
      // AM or PM
      return f.a()
        .toUpperCase();
    },
    B: function () {
      // Swatch Internet time; 000..999
      var H = jsdate.getUTCHours() * 36e2;
      // Hours
      var i = jsdate.getUTCMinutes() * 60;
      // Minutes
      // Seconds
      var s = jsdate.getUTCSeconds();
      return _pad(Math.floor((H + i + s + 36e2) / 86.4) % 1e3, 3);
    },
    g: function () {
      // 12-Hours; 1..12
      return f.G() % 12 || 12;
    },
    G: function () {
      // 24-Hours; 0..23
      return jsdate.getHours();
    },
    h: function () {
      // 12-Hours w/leading 0; 01..12
      return _pad(f.g(), 2);
    },
    H: function () {
      // 24-Hours w/leading 0; 00..23
      return _pad(f.G(), 2);
    },
    i: function () {
      // Minutes w/leading 0; 00..59
      return _pad(jsdate.getMinutes(), 2);
    },
    s: function () {
      // Seconds w/leading 0; 00..59
      return _pad(jsdate.getSeconds(), 2);
    },
    u: function () {
      // Microseconds; 000000-999000
      return _pad(jsdate.getMilliseconds() * 1000, 6);
    },

    // Timezone
    e: function () {
      // Timezone identifier; e.g. Atlantic/Azores, ...
      // The following works, but requires inclusion of the very large
      // timezone_abbreviations_list() function.
      /*              return that.date_default_timezone_get();
       */
      throw 'Not supported (see source code of date() for timezone on how to add support)';
    },
    I: function () {
      // DST observed?; 0 or 1
      // Compares Jan 1 minus Jan 1 UTC to Jul 1 minus Jul 1 UTC.
      // If they are not equal, then DST is observed.
      var a = new Date(f.Y(), 0);
      // Jan 1
      var c = Date.UTC(f.Y(), 0);
      // Jan 1 UTC
      var b = new Date(f.Y(), 6);
      // Jul 1
      // Jul 1 UTC
      var d = Date.UTC(f.Y(), 6);
      return ((a - c) !== (b - d)) ? 1 : 0;
    },
    O: function () {
      // Difference to GMT in hour format; e.g. +0200
      var tzo = jsdate.getTimezoneOffset();
      var a = Math.abs(tzo);
      return (tzo > 0 ? '-' : '+') + _pad(Math.floor(a / 60) * 100 + a % 60, 4);
    },
    P: function () {
      // Difference to GMT w/colon; e.g. +02:00
      var O = f.O();
      return (O.substr(0, 3) + ':' + O.substr(3, 2));
    },
    T: function () {
      // Timezone abbreviation; e.g. EST, MDT, ...
      // The following works, but requires inclusion of the very
      // large timezone_abbreviations_list() function.
      /*              var abbr, i, os, _default;
      if (!tal.length) {
        tal = that.timezone_abbreviations_list();
      }
      if (that.php_js && that.php_js.default_timezone) {
        _default = that.php_js.default_timezone;
        for (abbr in tal) {
          for (i = 0; i < tal[abbr].length; i++) {
            if (tal[abbr][i].timezone_id === _default) {
              return abbr.toUpperCase();
            }
          }
        }
      }
      for (abbr in tal) {
        for (i = 0; i < tal[abbr].length; i++) {
          os = -jsdate.getTimezoneOffset() * 60;
          if (tal[abbr][i].offset === os) {
            return abbr.toUpperCase();
          }
        }
      }
      */
      return 'UTC';
    },
    Z: function () {
      // Timezone offset in seconds (-43200...50400)
      return -jsdate.getTimezoneOffset() * 60;
    },

    // Full Date/Time
    c: function () {
      // ISO-8601 date.
      return 'Y-m-d\\TH:i:sP'.replace(formatChr, formatChrCb);
    },
    r: function () {
      // RFC 2822
      return 'D, d M Y H:i:s O'.replace(formatChr, formatChrCb);
    },
    U: function () {
      // Seconds since UNIX epoch
      return jsdate / 1000 | 0;
    }
  };
  this.date = function (format, timestamp) {
    that = this;
    jsdate = (timestamp === undefined ? new Date() : // Not provided
      (timestamp instanceof Date) ? new Date(timestamp) : // JS Date()
      new Date(timestamp * 1000) // UNIX timestamp (auto-convert to int)
    );
    return format.replace(formatChr, formatChrCb);
  };
  return this.date(format, timestamp);
}