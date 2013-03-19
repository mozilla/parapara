Wall API
========

JSON API
--------

<dl>
<dt>/api/walls[POST]</dt>
<dd>Create new wall [session required].
Parameters:
* <code>name</code> (Name of wall) [Required]
* <code>design</code> (ID of design to use) [Required]
Returns:
The created wall (same parameters as when getting wall)
Errors:
* TBD
</dd>
<dt>/api/walls/<wall-id>[GET]</dt>
<dd>
Returns the specified wall.
Errors:
* <code>not-found</code> - Wall ID wasn't located
* TBD
</dd>
