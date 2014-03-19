# Desire2Learn Grades Export Tool

This tool retrieves grade items from a course offering in a Desire2Learn learning environment and exports the data in a format suitable for import into PeopleSoft Campus Solutions.

## Implementation

The export tool exists as a single-page, client-side web application that uses the Desire2Learn Valence APIs to access user, course, and grade information. PeopleSoft format grades data is generated in the client web browser, then provided as a download using [Blobs](http://www.w3.org/TR/FileAPI/#dfn-Blob) and the [download attribute](http://www.w3.org/TR/html5/links.html#attr-hyperlink-download) in supported browsers, or by posting to a server that reflects the data back with a `Content-Disposition: attachment` header.

### Valence API Calls

#### [`GET /d2l/api/lp/1.4/enrollments/myenrollments`][1]

Lorem ipsum.

#### [`GET /d2l/api/le/1.4/(orgUnitId)/classlist/`][2]

Lorem ipsum.

#### [`GET /d2l/api/le/1.4/(orgUnitId)/grades/`][3]

Lorem ipsum.

#### [`GET /d2l/api/le/1.4/(orgUnitId)/grades/(gradeObjectId)/values/(userId)`][4]

Lorem ipsum.

[1]: http://docs.valence.desire2learn.com/res/enroll.html#get--d2l-api-lp-(version)-enrollments-myenrollments-
[2]: http://docs.valence.desire2learn.com/res/enroll.html#get--d2l-api-le-(version)-(orgUnitId)-classlist-
[3]: http://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-
[4]: http://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-(gradeObjectId)-values-(userId)

### Client-side File Download

The PeopleSoft grades data is generated wholly within the client browser. This presents some challenges for invoking a user file download. The following two approaches are used.

#### File API Blob and the Download Attribute

If the client browser supports Blobs and the download attribute on anchor elements, then these are used.

#### Server-side Data Reflector

For all other browsers, a small bit of code on a web server is used to “bounce” the grades data back to the client to initiate a file download.