# Desire2Learn Grades Export Tool

This tool retrieves grade items from a course offering in a Desire2Learn learning environment and exports the data in a format suitable for import into PeopleSoft Campus Solutions.

## Implementation

The export tool exists as a single-page, client-side web application that uses the Desire2Learn Valence APIs to access user, course, and grade information. PeopleSoft formatted grades data is generated in the client web browser, then provided as a download using [Blobs](http://www.w3.org/TR/FileAPI/#dfn-Blob) and the [download attribute](http://www.w3.org/TR/html5/links.html#attr-hyperlink-download) in supported browsers, or by posting to a server that reflects the data back with a `Content-Disposition: attachment` header.

### Valence API Calls

#### [`GET /d2l/api/lp/1.4/enrollments/myenrollments`][1]

*Retrieves the list of all enrollments for the current user.*

This method is used to retrieve all the enrollments for the current user, for the user to choose from. In the current implementation, no grouping or filtering options are presented to the user.

        {
            "PagingInfo": {
                "Bookmark": "29529",
                "HasMoreItems": false
            },
            "Items": [
                {
                    "OrgUnit": {
                        "Id": 6606,
                        "Type": {
                            "Id": 1,
                            "Code": "Organization",
                            "Name": "Organization"
                        },
                        "Name": "University of Calgary",
                        "Code": null
                    },
                    "Access": {
                        "IsActive": true,
                        "StartDate": null,
                        "EndDate": null,
                        "CanAccess": true
                    }
                },
                {
                    "OrgUnit": {
                        "Id": 99999,
                        "Type": {
                            "Id": 3,
                            "Code": "Course Offering",
                            "Name": "Course Offering"
                        },
                        "Name": "Grades Export Course",
                        "Code": "GRADES_EXPORT_COURSE"
                    },
                    "Access": {
                        "IsActive": true,
                        "StartDate": null,
                        "EndDate": null,
                        "CanAccess": true
                    }
                }
            ]
        }

#### [`GET /d2l/api/le/1.4/(orgUnitId)/grades/`][3]

*Retrieve all the current grade objects for a particular org unit.*

When the user selects a course offering, the list of grade objects for that course is fetched. The returned grade objects does not include the final grade. That is separately added to the list of grade objects with an `orgUnitId` of `final`.

There is a select element that allows the user to select a specific grade object to export, but it is hidden using CSS in the current implementation. The final grade is set as the default grade object to export.

        [
            {
                "MaxPoints": 50,
                "CanExceedMaxPoints": false,
                "IsBonus": false,
                "ExcludeFromFinalGradeCalculation": false,
                "GradeSchemeId": null,
                "Id": 999999,
                "Name": "Mid-Terms",
                "ShortName": "",
                "GradeType": "Numeric",
                "CategoryId": 0,
                "Description": {
                    "Text": "",
                    "Html": ""
                },
                "Weight": 10
            }
        ]

#### [`GET /d2l/api/le/1.4/(orgUnitId)/classlist/`][2]

*Retrieve the enrolled users in the classlist for an org unit.*

There is no API call for retrieving all the grade values for a given grade object. So, when the export happens, the classlist for the selected course offering is retrieved, then iterated over to retrieve the grade value for each enrolled user.

        [
            {
                "Identifier": "99996",
                "ProfileIdentifier": "aBcDeFgHiJ",
                "DisplayName": "D'Arcy Norman",
                "Username": null,
                "OrgDefinedId": "00000006",
                "Email": "example1@example.edu"
            },
            {
                "Identifier": "99997",
                "ProfileIdentifier": "bCdEfGhIjK",
                "DisplayName": "Ruby Isadora Mok-Kulakova",
                "Username": null,
                "OrgDefinedId": "00000007",
                "Email": "example2@example.edu"
            },
            {
                "Identifier": "99998",
                "ProfileIdentifier": "cDeFgHiJkL",
                "DisplayName": "King Chung Huang",
                "Username": null,
                "OrgDefinedId": "00000008",
                "Email": "example3@example.edu"
            },
            {
                "Identifier": "99999",
                "ProfileIdentifier": "dEfGhIjKlM",
                "DisplayName": "Lauren Corbett-McGuffin",
                "Username": null,
                "OrgDefinedId": "00000009",
                "Email": "example4@example.edu"
            }
        ]

#### [`GET /d2l/api/le/1.4/(orgUnitId)/grades/(gradeObjectId)/values/(userId)`][4]

*Retrieve a specific grade value for a particular user assigned in an org unit.*

This API call is used inconjunction with the classlist to retrieve the grade value for a specified user and grade object.

        {
            "PointsNumerator": 36,
            "PointsDenominator": 50,
            "WeightedNumerator": null,
            "WeightedDenominator": null,
            "GradeObjectIdentifier": "999998",
            "GradeObjectName": "Final Calculated Grade",
            "GradeObjectType": 7,
            "GradeObjectTypeName": null,
            "DisplayedGrade": "72 %"
        }

[1]: http://docs.valence.desire2learn.com/res/enroll.html#get--d2l-api-lp-(version)-enrollments-myenrollments-
[2]: http://docs.valence.desire2learn.com/res/enroll.html#get--d2l-api-le-(version)-(orgUnitId)-classlist-
[3]: http://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-
[4]: http://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-(gradeObjectId)-values-(userId)

### Client-side File Download

The PeopleSoft grades data is generated wholly within the client browser. This presents some challenges for invoking a user file download. The following two approaches are used.

#### File API Blob and the Download Attribute

If the client browser supports Blobs and the download attribute on anchor elements, then these are used.

Support for Blobs and the download attribute is done by checking to see if they are not `undefined`

        var anchor_e = document.createElement('a');
        if (typeof (Blob) != 'undefined' && typeof(anchor_e.download) != 'undefined') { … }

A Blob is created with PeopleSoft grades data, then a URL is generated for that blob and used to create a normal anchor element, with the download attribute specified.

        var grades_blob = new Blob([grades_data], {type:'text/csv'});
        anchor_e.download = filename;
        anchor_e.href = window.URL.createObjectURL(grades_blob);
        anchor_e.textContent = 'Download ' + anchor_e.download;

When the user clicks on the link, the grades data is downloaded as a file.

#### Server-side Data Reflector

For all other browsers, a small bit of code on a web server is used to “bounce” the grades data back to the client to initiate a file download.

A form with the filename and grades data as hidden input elements is created, with a submit button that initiates the form submission. A custom Drupal module is used that take the incoming grades content and filename, and returns it back to the requestor with a `Content-Disposition: attachment` header to request a file download in the browser.

        var form = '<form method="post" enctype="application/x-www-form-urlencoded">' +
            '<input type="hidden" name="filename" value="' + filename + '">' +
            '<input type="hidden" name="content">' +
            '<input type="submit" value="Download ' + filename + '">' +
            '</form>';
        $('#d2l-grades-download')
            .empty()
            .append(form)
            .find('input[name="content"]')
            .val(grades_data);

## License

Copyright 2014 University of Calgary

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.