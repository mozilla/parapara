Wall API
========

Common errors
-------------

The following errors are not listed under each API since they're pretty common.

* <code>logged-out</code> - No session was available for an API that requires a login
* <code>no-auth</code> - Authorization check failed (e.g. trying to change someone else's wall)
* <code>server-error</code> - Something unexpected went wrong with the server
* <code>bad-request</code> - The parameters to the function were missing or of the wrong format

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
