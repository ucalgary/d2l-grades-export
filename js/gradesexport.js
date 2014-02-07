(function() {
	var GradesExport = GradesExport || {};
	
	GradesExport.config = {
		'scheme': 'https',
		'host': 'd2l-test1.ucalgary.ca',
		'port': '443',
		'appId': 'LpVOEjqKg1279EaEXDGhkA',
		'appKey': 'OhjdRsrweiKhPIAZPH0GFA',
		'userId': '',
		'userKey': ''
	};

	GradesExport.init = function() {
		this.appContext = new D2L.ApplicationContext('localhost', GradesExport.config.appId, GradesExport.config.appKey);
		this.userContext = GradesExport.appContext.createUserContext(this.config.scheme + '://' + this.config.host, 443, window.location.href);
	};

	GradesExport.authenticate = function(cb) {
		if (typeof this.userContext == 'undefined' ||
	      typeof this.userContext.userId == 'undefined' ||
	             this.userContext.userId == '') {
			// If there is no active user, begin the authentication process
			var callback = window.location.href;
			var url = GradesExport.appContext.createUrlForAuthentication(this.config.scheme + '://' + this.config.host, this.config.port, callback);
		
			window.location = url;
		} else {
			$.event.trigger('GEDidAuthenticateUser', [GradesExport.userContext.userId]);
		}
	};

	GradesExport.loadCourses = function(ev, userId) {
		var errorHandler = function(xhr, options, error) {

		};

		var successHandler = function(data) {
			// Note: paging is being ignored
			if (typeof data === 'string') {
				data = JSON.parse(data);
			}

			// Find courses by filtering the enrollments in Items where OrgUnit.Type.Id is 3.
			var courses = $(data['Items']).filter(function() {
				return this['OrgUnit']['Type']['Id'] == 3;
			});

			// Populate the courses' select options
			var courseOptions = $.map(courses, function(val, i) {
				return '<option value="' + val['OrgUnit']['Id'] + '">' + val['OrgUnit']['Name'] + '</option>';
			})

			$('#d2l-courses')
				.find('option')
				.remove()
				.end()
				.append(courseOptions.join(''));
		};

		var url = GradesExport.userContext.createUrlForAuthentication('/d2l/api/lp/1.4/enrollments/myenrollments/', 'GET');

		$.jsonp({
			url: url,
			callbackParameter: 'callback',
			success: successHandler,
			error: errorHandler
		});
	}

	$(document).ready(function() {
		// Register for events
		$(document).on('GEDidAuthenticateUser', GradesExport.loadCourses);

		// Kick off the app by initializing and authenticating
		GradesExport.init();
		GradesExport.authenticate();
	});
}).call(this);