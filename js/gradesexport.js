(function($) {
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

	GradesExport.gradesSpecifier = {
		orgUnitId: null,
		courseCode: null,
		gradeObjectId: 'final',
		gradeObjectLabel: 'Final Grade'
	};

	GradesExport.gradesData = {
		orgUnitComponents: null,
		gradesData: null,
		gradesBlob: null
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

	GradesExport.updateGradesSpecifier = function(ev) {
		var target = $(ev.target);
		var key = target.attr('data-specifier-key');
		var val = target.val();

		if (key != null && GradesExport.gradesSpecifier[key] != val) {
			GradesExport.gradesSpecifier[key] = val;

			if (key == 'orgUnitId') {
				GradesExport.gradesSpecifier['gradeObjectId'] = 'final';
				GradesExport.gradesSpecifier['courseCode'] = target.find(':selected').attr('data-code');
			}

			if (key == 'gradeObjectId') {
				GradesExport.gradesSpecifier['gradeObjectLabel'] = target.find(':selected').text();
			}

			console.log(GradesExport.gradesSpecifier);

			$.event.trigger('GEDidChangeGradesSpecifier');
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
				return '<option value="' + val['OrgUnit']['Id'] + '" data-code="' + val['OrgUnit']['Code'] + '">' + val['OrgUnit']['Name'] + '</option>';
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

			data.push({
				'Name': 'Final Grade',
				'Id': 'final'
			});

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

	GradesExport.loadSpecifiedGradeItem = function(ev) {
		var specifier = GradesExport.gradesSpecifier;
		if (specifier.orgUnitId == null || specifier.gradeObjectId == null) {
			return;
		}

		var classlistErrorHandler = function(xhr, options, error) {

		};

		var classlistSuccessHandler = function(data) {
			if (typeof data === 'string') {
				data = JSON.parse(data);
			}

			var data_counter = data.length;
			var gradesResponseReceived = function() {
				if (--data_counter == 0) {
					GradesExport.gradesData.gradesData = data;

					$.event.trigger('GEDidLoadGradesData', [GradesExport.gradesData.gradesData]);
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

		var courseId = specifier.orgUnitId;
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
		$('#d2l-courses, #d2l-grade-items').attr('disabled', 'disabled');
	}

	GradesExport.processGrades = function(ev, data) {
		var course_code = GradesExport.gradesSpecifier['courseCode'];
		var course_code_components = course_code.match(/([WPSF])(\d{4})(\w{4})(\d*)([AB]?)([LSBT])(\d{2})/);

		// If the course type is lecture, drop the L.
		// Lectures are transmitted by number only for PeopleSoft grades.
		if (course_code_components[6] == 'L') {
			course_code_components[6] = '';
		}

		// If the course number has a letter suffix of A, change it to B.
		// Grades for full year courses are submitted to the B component.
		if (course_code_components[5] == 'A') {
			course_code_components[5] = 'B';
		}

		var course_row = course_code_components[3] + ',' + course_code_components[4] + course_code_components[5] + ',' + course_code_components[6] + course_code_components[7] + ',';
		var grade_rows = new Array();

		for (var i = 0; i < data.length; i++) {
			var person = data[i];
			if (!('Grades' in person)) {
				continue;
			}

			grade_rows.push(person['OrgDefinedId'] + ',' + person['Grades']['DisplayedGrade'] + ',');
		}

		var grades_data = course_row + '\n' + grade_rows.join('\n');
		var filename = course_code + ' ' + GradesExport.gradesSpecifier['gradeObjectLabel'] + '.txt';

		// Determine how to present the grades data as a download for the user
		var anchor_e = document.createElement('a');
		if (typeof (Blob) != 'undefined' && typeof(anchor_e.download) != 'undefined') {
			// This browser supports Blob objects and the download attribute.
			// Encapsulate grades_data in a Blob, create an download anchor for it.
			var grades_blob = new Blob([grades_data], {type:'text/csv'});
			anchor_e.download = filename;
			anchor_e.href = window.URL.createObjectURL(grades_blob);
			anchor_e.textContent = 'Download ' + anchor_e.download;
			anchor_e.style = 'display:none';

			$('#d2l-grades-download')
				.empty()
				.append(anchor_e);
		} else {
			// Use the “bouncer” installed on the d2l site to cause a download.
			var form = '<form method="post" enctype="application/x-www-form-urlencoded"><input type="hidden" name="filename" value="' + filename + '"><input type="hidden" name="content"><input type="submit" value="Download ' + filename + '"></form>';
			$('#d2l-grades-download')
				.empty()
				.append(form)
				.find('input[name="content"]')
				.val(grades_data);
		}

		$('#d2l-courses, #d2l-grade-items').removeAttr('disabled');
	};

	$(document).ready(function() {
		// Register for events
		$(document).on('GEDidAuthenticateUser', GradesExport.loadCourses);
		
		$('#d2l-courses').on('change', GradesExport.updateGradesSpecifier);
		$('#d2l-grade-items').on('change', GradesExport.updateGradesSpecifier);

		$('#d2l-courses').on('change', GradesExport.loadGradeItems);
		$(document).on('GEDidChangeGradesSpecifier', GradesExport.loadSpecifiedGradeItem);
		// $('#d2l-grade-items').on('change', GradesExport.loadGradeItemDetails);
		$(document).on('GEWillLoadGradesData', GradesExport.waitForGrades);
		$(document).on('GEDidLoadGradesData', GradesExport.processGrades);

		// Kick off the app by initializing and authenticating
		GradesExport.init();
		GradesExport.authenticate();
	});
}).call(this, jQuery);
