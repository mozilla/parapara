Wall API
========

Common errors
-------------

The following errors are not listed under each API since they're pretty common.

* <code>logged-out</code> - No session was available for an API that requires a login
* <code>no-auth</code> - Authorization check failed (e.g. trying to change someone else's wall)
* <code>server-error</code> - Something unexpected went wrong with the server
* <code>bad-request</code> - The parameters to the function were missing or of the wrong format

Errors are specified in the <code>error_key</code> element of the returned JSON array.
Sometimes there is a <code>error_detail</code> element too and occasionally it contains some useful information.

JSON API
--------

<dl>
<dt>/api/walls[POST]</dt>
<dd>Create new wall [session required].

Parameters:
* <code>name</code> (Name of wall) [Required]
* <code>design</code> (ID of design to use) [Required]

Returns:
the created wall (same parameters as when getting wall)

Errors:
* TBD
</dd>
<dt>/api/walls/&lt;wall-id>[GET]</dt>
<dd>Get details of the specified wall [auth required].

Returns:
the specified wall.

Errors:
* <code>not-found</code> - Wall ID wasn't located
* TBD
</dd>
<dt>/api/walls/&lt;wall-id>[PUT]</dt>
<dd>Updates the specified wall.

Parameters:
* key &rarr; value

(You can provide multiple keys and values but then when you get an error you
won't know which key caused it so it's not very useful at the moment.)

Accepted keys:
* <code>name</code> &rarr; Update wall name
  * Returns <code>name</code> (the wall sanitized wall name--basically trims
    whitespace)
  * Specific errors:
    <code>duplicate-name</code> (there is already another wall with that name)
* <code>urlPath</code> &rarr; Update path component of URL
  * Returns <code>wallUrl</code> (the full URL of the wall--URL encoded),
    <code>editorUrl</code> (the full URL of the editor--URL encoded), and, if
    a URL shortening service is available <code>editorUrlShort</code> (the
    shortened editor URL)
  * Specific errors: <code>bad-path</code> (the path is not acceptable: is
    empty, has slashes, dots etc.), <code>duplicate-path</code> (there is
    already another wall with that path)
* <code>designId</code> &rarr; Update the design of the wall
  * Returns <code>designId</code> (the provided design ID),
    <code>thumbnail</code> (an updated thumbnail for the wall),
    <code>defaultDuration</code> (the duration specified for the update design)
  * Specific errors: <code>bad-design</code> (the design wasn't found)
* <code>duration</code> &rarr; Update the number of milliseconds taken to
  complete one cycle of the wall
  * Accepts either an integer number of milliseconds of <code>null</code> to
    mean, "Reset back to the default duration for this design"
  * Returns <code>duration</code> and <code>defaultDuration</code>

Errors:
* <code>not-found</code> - The specified wall doesn't seem to exist
* <code>readonly-field</code> - The key is recognized, but you can't change that field
* <code>unknown-field</code> - The key isn't recognized
</dd>
<dt>/api/walls/&lt;wall-id>/sessions[POST]</dt>
<dd>Closes the most recent session if it is open and creates a new session [auth required].

Parameters:
* <code>sessionId</code> (The ID of the latest session) [Required]

Returns:
details of the latest session

Errors:
* <code>parallel-change</code> - The provided <code>sessionId</code> did not match the ID of the latest session. The <code>error_detail</code> in this case is filled in with the latest session.
</dd>
<dt>/api/walls/&lt;wall-id>/sessions/&lt;session-id>[PUT]</dt>
<dd>Closes the current session [auth required].

Returns:
details of the latest session

Errors:
* <code>parallel-change</code> - The <code>session-id</code> specified in the URL did not match the ID of the latest session or that sesssion has already been closed. The <code>error_detail</code> in this case is filled in with the latest session.
</dd>
