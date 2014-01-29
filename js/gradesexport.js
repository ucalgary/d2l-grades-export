(function() {
	var GradesExport = GradesExport || {};
	
	GradesExport.config = {
		'scheme': 'https',
		'host': 'd2l.ucalgary.ca',
		'port': '443',
		'appId': 'LpVOEjqKg1279EaEXDGhkA',
		'appKey': 'OhjdRsrweiKhPIAZPH0GFA',
		'userId': '',
		'userKey': ''
	};

	GradesExport.init = function(cb) {
		GradesExport.appContext = new D2L.ApplicationContext('localhost', GradesExport.config.appId, GradesExport.config.appKey);
		GradesExport.userContext = GradesExport.appContext.createUserContext('d2l.ucalgary.ca', 80, window.location.href);
		
		if (typeof GradesExport.userContext == 'undefined' ||
			typeof GradesExport.userContext.userId == 'undefined' ||
				   GradesExport.userContext.userId == '') {
			// If there is no active user, begin the authentication process
			var callback = window.location.href;
			var url = GradesExport.appContext.createUrlForAuthentication(GradesExport.config.scheme + '://' + GradesExport.config.host, GradesExport.config.port, callback);
		
			window.location = url;
		} else {
			// If there is an active user, load the user's course sections
		
			cb();
		}
	};

	$(document).ready(function() {
		GradesExport.init(function() {
			console.log('userId: ' + GradesExport.userContext.userId);
		});
	});
}).call(this);