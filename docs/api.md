Wall API
========

Common errors
-------------

The following errors are not listed under each API since they're pretty common.

* <code>logged-out</code> - No session was available for an API that requires
                            a login
* <code>no-auth</code> - Authorization check failed (e.g. trying to change
                         someone else's wall)
* <code>server-error</code> - Something unexpected went wrong with the server
* <code>bad-request</code> - Required parameters to the function were missing or
                             of the wrong format

Errors are specified in the <code>error_key</code> element of the returned JSON
array.
Sometimes there is a <code>error_detail</code> element too and occasionally it
contains some useful information.

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
the specified wall with the following parameters.
* <code>wallId</code> - The unique ID of the wall
* <code>name</code> - The name of the wall
* <code>wallUrl</code> - The URL of the wall running the latest session
* <code>editorUrl</code> - The URL of the editor tied to this wall
* <code>editorUrlShort</code> - A shortened version of <code>editorUrl</code>.
  <code>null</code> if no shortening service was available.
* <code>duration</code> - The number of milliseconds required to complete
  a single iteration of the wall.
  Will be <code>null</code> if the design default duration is used (as specified
  by <code>defaultDuration</code>).
* <code>defaultDuration</code> - The default number of milliseconds required to
  complete a single of the wall as specified by the design.
* <code>ownerEmail</code> - The email address of the person who is the owner of
  the wall.
* <code>designId</code> - The unique identified of the design in use for this
  wall.
* <code>thumbnail</code> - A thumbnail representation of the wall.
* <code>status</code> - Either <code>running</code> or <code>finished</code>
  depending on if this wall has an active session or not.
* <code>latestSession</code> - The most recently created session. Includes the
  following information.
 * <code>sessionId</code> - The identifier of the session
 * <code>start</code> - The time when the session was started in the format
  "Y-m-d H:i:s"
 * <code>end</code> - The time when the session was ended in the format
  "Y-m-d H:i:s" or <code>null</code> if the session has not yet ended.

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
<dt>/api/walls/&lt;wall-id>/sessions[GET]</dt>
<dd>Gets the list of sessions for the wall [auth currently required].

Returns:
an array of sessions ordered by sessionId with the following information
for each session:
* <code>sessionId</code> - The identifier of the session
* <code>start</code> - The time when the session was started in the format
  "Y-m-d H:i:s"
* <code>end</code> - The time when the session was ended in the format
  "Y-m-d H:i:s" or <code>null</code> if the session has not yet ended.
</dd>
<dt>/api/walls/&lt;wall-id>/sessions[POST]</dt>
<dd>Closes the most recent session if it is open and creates a new session [auth required].

Parameters:
* <code>sessionId</code> (The ID of the latest session) [Required]

Returns:
details of the latest session using the same format as each of the elements
returned in the list of sessions.

Errors:
* <code>parallel-change</code> - The provided <code>sessionId</code> did not match the ID of the latest session. The <code>error_detail</code> in this case is filled in with the latest session.
</dd>
<dt>/api/walls/&lt;wall-id>/sessions/&lt;session-id>[PUT]</dt>
<dd>Closes the current session [auth required].

Returns:
details of the latest session using the same format as each of the elements
returned in the list of sessions.

Errors:
* <code>parallel-change</code> - The <code>session-id</code> specified in the URL did not match the ID of the latest session or that sesssion has already been closed. The <code>error_detail</code> in this case is filled in with the latest session.
</dd>
