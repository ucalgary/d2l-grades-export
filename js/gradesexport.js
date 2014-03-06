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
			}).join('');

			$('#d2l-courses')
				.find('option')
				.remove()
				.end()
				.append(courseOptions);
		};

		var url = GradesExport.userContext.createUrlForAuthentication('/d2l/api/lp/1.4/enrollments/myenrollments/', 'GET');

		$.jsonp({
			url: url,
			callbackParameter: 'callback',
			success: successHandler,
			error: errorHandler
		});
	};

	GradesExport.loadGradeItems = function(ev) {
		var errorHandler = function(xhr, options, error) {

		};

		var successHandler = function(data) {
			if (typeof data === 'string') {
				data = JSON.parse(data);
			}

			// Populate the grade items' select options
			var gradeItemOptions = $.map(data, function(val, i) {
				return '<option value="' + val['Id'] + '">' + val['Name'] + '</option>';
			}).join('');

			$('#d2l-grade-items')
				.find('option')
				.remove()
				.end()
				.append(gradeItemOptions);
		};

		var courseId = $(this).val();
		var url = GradesExport.userContext.createUrlForAuthentication('/d2l/api/le/1.4/' + courseId + '/grades/', 'GET');

		$.jsonp({
			url: url,
			callbackParameter: 'callback',
			success: successHandler,
			error: errorHandler
		});
	};

	GradesExport.loadGradeItemDetails = function(ev) {
		var errorHandler = function(xhr, options, error) {

		};

		var successHandler = function(data) {
			if (typeof data === 'string') {
				data = JSON.parse(data);
			}

			// Extract the relevant data
			var gradeItemDetails = {
				'Grade Type': data['GradeType'],
				'Description': data['Description']['Text']
			};

			// Populate the grade item details' names and values
			var gradeItemDescriptions = $.map(gradeItemDetails, function(val, key) {
				return '<dt>' + key + '</dt><dd>' + (val ? val : 'None') + '</dd>';
			}).join('');

			$('#d2l-grade-items + dl')
				.find('dt, dd')
				.remove()
				.end()
				.append(gradeItemDescriptions);
		};

		var courseId = $('#d2l-courses').val();
		var gradeItemId = $(this).val();
		var url = GradesExport.userContext.createUrlForAuthentication('/d2l/api/le/1.4/' + courseId + '/grades/' + gradeItemId, 'GET');

		$.jsonp({
			url: url,
			callbackParameter: 'callback',
			success: successHandler,
			error: errorHandler
		})
	};

	GradesExport.downloadGrades = function(ev) {
		var classlistErrorHandler = function(xhr, options, error) {

		};

		var classlistSuccessHandler = function(data) {
			if (typeof data === 'string') {
				data = JSON.parse(data);
			}

			var data_counter = data.length;
			var gradesResponseReceived = function() {
				if (--data_counter == 0) {
					$.event.trigger('GEDidLoadGradesData', [data]);
				}
			}

			var gradesErrorHandler = function(xhr, options, error) {
				gradesResponseReceived();
			};

			var gradesSuccessHandler = function(data) {
				if (typeof data === 'string') {
					data = JSON.parse(data);
				}

				this['Grades'] = data;
				console.log(this['Identifier'] + ' ' + data['DisplayedGrade']);

				gradesResponseReceived();
			};

			// For each enrolled person, get that student's grade value
			for (var i = 0; i < data.length; i++) {
				var person = data[i];
				var gradesUrl = GradesExport.userContext.createUrlForAuthentication('/d2l/api/le/1.4/' + courseId + '/grades/final/values/' + person['Identifier'], 'GET');

				$.jsonp({
					url: gradesUrl,
					callbackParameter: 'callback',
					context: person,
					success: gradesSuccessHandler,
					error: gradesErrorHandler
				});
			}
		};

		var courseId = $('#d2l-courses').val();
		var classlistUrl = GradesExport.userContext.createUrlForAuthentication('/d2l/api/le/1.4/' + courseId + '/classlist/', 'GET');

		$.event.trigger('GEWillLoadGradesData');

		$.jsonp({
			url: classlistUrl,
			callbackParameter: 'callback',
			success: classlistSuccessHandler,
			error: classlistErrorHandler
		});
	};

	GradesExport.waitForGrades = function(ev) {
		$('#d2l-grades-download').attr('disabled', 'disabled');
	}

	GradesExport.processGrades = function(ev, data) {
		console.log(data);
		$('#d2l-grades-download').removeAttr('disabled');
	};

	$(document).ready(function() {
		// Register for events
		$(document).on('GEDidAuthenticateUser', GradesExport.loadCourses);
		$('#d2l-courses').on('change', GradesExport.loadGradeItems);
		// $('#d2l-grade-items').on('change', GradesExport.loadGradeItemDetails);
		$('#d2l-grades-download').on('click', GradesExport.downloadGrades);
		$(document).on('GEWillLoadGradesData', GradesExport.waitForGrades);
		$(document).on('GEDidLoadGradesData', GradesExport.processGrades);

		// Kick off the app by initializing and authenticating
		GradesExport.init();
		GradesExport.authenticate();
	});
}).call(this);