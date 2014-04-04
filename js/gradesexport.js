(function($) {
	var GradesExport = GradesExport || {};
	
	GradesExport.config = {
		'scheme': 'https',
		'host': 'lms.valence.desire2learn.com',
		'port': '443',
		'appId': 'G9nUpvbZQyiPrk3um2YAkQ',
		'appKey': 'ybZu7fm_JKJTFwKEHfoZ7Q',
		'userId': '',
		'userKey': ''
	};

	GradesExport.gradesSpecifier = {
		orgUnitId: null,
		sectionOrgUnitId: null,
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
		if (typeof(GradesExport.config) == 'string') {
			GradesExport.config = JSON.parse(CryptoJS.AES.decrypt(GradesExport.config, document.URL.split('?')[0]).toString(CryptoJS.enc.Utf8));
		}
		this.appContext = new D2L.ApplicationContext('localhost', GradesExport.config.appId, GradesExport.config.appKey);
		this.userContext = GradesExport.appContext.createUserContext(this.config.scheme + '://' + this.config.host, 443, window.location.href);

		var spinnerOpts = {
			lines: 9, // The number of lines to draw
			length: 4, // The length of each line
			width: 2, // The line thickness
			radius: 3, // The radius of the inner circle
			corners: 1, // Corner roundness (0..1)
			rotate: 0, // The rotation offset
			direction: 1, // 1: clockwise, -1: counterclockwise
			color: '#000', // #rgb or #rrggbb or array of colors
			speed: 1, // Rounds per second
			trail: 60, // Afterglow percentage
			shadow: false, // Whether to render a shadow
			hwaccel: true, // Whether to use hardware acceleration
			className: 'spinner', // The CSS class to assign to the spinner
			zIndex: 2e9, // The z-index (defaults to 2000000000)
			top: 'auto', // Top position relative to parent in px
			left: 'auto' // Left position relative to parent in px
		};
		$('#d2l-steps h2').each(function(idx, val) {
			var spinner = new Spinner(spinnerOpts).spin();
			console.log(spinner);
			$(val).append(spinner.el);
		});
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
			// Call WhoAmI to get the user's information
			var errorHandler = function(xhr, options, error) {

			};

			var successHandler = function(data) {
				// Note: paging is being ignored
				if (typeof data === 'string') {
					data = JSON.parse(data);
				}

				GradesExport.gradesSpecifier['user'] = data;
				$.event.trigger('GEDidAuthenticateUser', [GradesExport.userContext.userId]);
			}

			var url = GradesExport.userContext.createUrlForAuthentication('/d2l/api/lp/1.4/users/whoami', 'GET');

			$.jsonp({
				url: url,
				callbackParameter: 'callback',
				success: successHandler,
				error: errorHandler
			});
		}
	};

	GradesExport.updateGradesSpecifier = function(ev) {
		var target = $(ev.target);
		var key = target.attr('data-specifier-key');
		var val = target.val();

		if (key != null && GradesExport.gradesSpecifier[key] != val) {
			GradesExport.gradesSpecifier[key] = val;

			if (key == 'orgUnitId') {
				var courseId = target.find(':selected').attr('data-course-id');
				if (!!courseId) {
					GradesExport.gradesSpecifier['sectionOrgUnitId'] = GradesExport.gradesSpecifier[key];
					GradesExport.gradesSpecifier[key] = courseId;

					console.log(GradesExport.gradesSpecifier);
				}

				GradesExport.gradesSpecifier['gradeObjectId'] = 'final';
				GradesExport.gradesSpecifier['courseCode'] = target.find(':selected').attr('data-code');
			}

			if (key == 'gradeObjectId') {
				GradesExport.gradesSpecifier['gradeObjectLabel'] = target.find(':selected').text();
			}

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

			var courses_counter = courses.length;
			var sectionsResponseReceived = function() {
				if (--courses_counter == 0) {
					// Populate the courses' select options
					var courseOptions = $.map(courses, function(val, i) {
						if (val['Sections'].length == 0) {
							return '<option value="' + val['OrgUnit']['Id'] 
							       + '" data-code="' + val['OrgUnit']['Code']
							       + '">'
							       + val['OrgUnit']['Name']
							       + '</option>';	
						} else {
							var courseCodeBase = val['OrgUnit']['Code'].substring(0, val['OrgUnit']['Code'].length - 3);
							var html = '<optgroup label="' + val['OrgUnit']['Name'] + '">';
							html += $.map(val['Sections'], function(sec, i) {
								return '<option value="' + sec['SectionId']
								       + '" data-code="' + courseCodeBase + sec['Name'].substring(sec['Name'].length - 3) 
								       + '" data-course-id="' + val['OrgUnit']['Id']
								       + '">'
								       + sec['Name']
								       + '</option>';
							}).join('');
							html += '</optgroup>';
							return html;
						}
					}).join('');

					$('#d2l-courses')
						.find('option')
						.remove()
						.end()
						.append(courseOptions);

					$(document.body).removeClass('d2l-wait-select');
				}
			}

			var sectionsErrorHandler = function(xhr, options, error) {
				this['Sections'] = [];
				sectionsResponseReceived();
			}

			var sectionsSuccessHandler = function(data) {
				if (typeof data === 'string') {
					data = JSON.parse(data);
				}

				this['Sections'] = data;
				sectionsResponseReceived();
			}

			for (var i = 0, count = courses.length; i < count; i++) {
				// For each course, determine if it has multiple section. If it does, present
				// the course offering as an optgroup, and the sections as the actual options.
				var course = courses[i];
				var sectionsUrl = GradesExport.userContext.createUrlForAuthentication('/d2l/api/lp/1.4/' + course['OrgUnit']['Id'] + '/sections/', 'GET');

				$.jsonp({
					url: sectionsUrl,
					callbackParameter: 'callback',
					context: course,
					success: sectionsSuccessHandler,
					error: sectionsErrorHandler
				});
			}
		};

		$(document.body).addClass('d2l-wait-select');

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

			$(document.body).removeClass('d2l-wait-select')
		};

		$(document.body).addClass('d2l-wait-select');

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
			$('#d2l-step-select .error')
				.empty()
				.text('An error occurred fetching information for the selected course. You might lack permissions to read class or grade information.');

			$('#d2l-courses, #d2l-grade-items').removeAttr('disabled');
			$(document.body).removeClass('d2l-wait-download-classlist');
		};

		var classlistSuccessHandler = function(data) {
			if (typeof data === 'string') {
				data = JSON.parse(data);
			}

			$('#d2l-step-download progress')
				.attr('max', data.length)
				.attr('value', 0);
			
			$(document.body).removeClass('d2l-wait-download-classlist');
			$(document.body).addClass('d2l-wait-download-gradesdata');

			var data_counter = data.length;
			var gradesResponseReceived = function() {
				--data_counter;
				
				var progress = $('#d2l-step-download progress');
				progress.attr('value', progress.attr('max') - data_counter);

				if (data_counter == 0) {
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
				var gradesUrl = GradesExport.userContext.createUrlForAuthentication('/d2l/api/le/1.4/' + courseId + '/grades/' + GradesExport.gradesSpecifier['gradeObjectId'] + '/values/' + person['Identifier'], 'GET');

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
		$(document.body).addClass('d2l-wait-download-classlist');
	}

	GradesExport.processGrades = function(ev, data) {
		var course_code = GradesExport.gradesSpecifier['courseCode'];
		var course_code_components = course_code.match(/([WPSF])(\d{4})(\w{4})(\d*)([AB]?)([LSBT])(\d{2})/);
		var course_row = null;
		var grade_rows = new Array();

		if (course_code_components == null && course_code.indexOf('F2013') == 0) {
			// In the specific case of Fall 2013, if the course code failed to be parsed, it might be
			// a full year course with an AB suffix on the catalog number. Try specifically filtering
			// out the B.
			course_code_components = course_code.match(/([WPSF])(\d{4})(\w{4})(\d*)([A]?)B([LSBT])(\d{2})/);
		}

		if (course_code_components != null) {
			// If the course type is lecture, drop the L.
			// Lectures are transmitted by number only for PeopleSoft grades.
			if (course_code_components[6] == 'L') {
				course_code_components[6] = '';
			}

			// If the course catalog number has a letter suffix of A, change it to B.
			// Grades for full year courses are submitted to the B component.
			if (course_code_components[5] == 'A') {
				course_code_components[5] = 'B';
			}

			// If the course catalog number is 5 digits long, then it should
			// be in the format XXX.YY.
			if (course_code_components[4].length == 5) {
				course_code_components[4] = course_code_components[4].slice(0, 3) + '.' + course_code_components[4].slice(3);
			}

			course_row = course_code_components[3] + ',' + course_code_components[4] + course_code_components[5] + ',' + course_code_components[6] + course_code_components[7] + ',';
		} else {
			// If course_code could not be parsed into components,
			// use the entire course code as the subject
			// and 0 for the course number and section values.
			course_row = course_code + ',0,0,';
		}
		
		for (var i = 0; i < data.length; i++) {
			var person = data[i];
			if (!('Grades' in person)) {
				continue;
			}

			grade_rows.push(person['OrgDefinedId'] + ',' + person['Grades']['DisplayedGrade'] + ',');
		}

		var grades_data = course_row + '\n' + grade_rows.join('\n');
		var filename = course_code + ' ' + GradesExport.gradesSpecifier['gradeObjectLabel'] + '.csv';

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

		$('#d2l-step-select .error').empty()
		$('#d2l-courses, #d2l-grade-items').removeAttr('disabled');
		$(document.body).removeClass('d2l-wait-download-gradesdata');
	};

	var init = function(context, settings) {
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
	}

	if (typeof(Drupal) != 'undefined' && typeof(Drupal.behaviors) != 'undefined') {
		Drupal.behaviors.gradesExportApp = {
			attach: init
		}
	} else {
		$(document).ready(init);
	}
	
}).call(this, jQuery);
