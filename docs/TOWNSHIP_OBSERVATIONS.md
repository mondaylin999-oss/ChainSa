# Township graph and sound selection

Implements the LocationRequest flow described in Earthbeat_Environmental_Module_Current_Progress.zip using the existing server-side NASA POWER integration.

Both map clicks and the township selector send townshipId with regionId. The server validates the township's parent region and chooses trusted coordinates from township-points.json; browser-supplied arbitrary coordinates are not accepted. Clearing township selection restores the regional reference point.

Points are derived from bundled MIMU PCode 9.4 polygons: for each polygon, scan latitude at 25%, 50% and 75% of its extent, pair intersections using the even-odd rule (including holes), and use the midpoint of the widest interior interval across all parts. Coordinates are rounded to six decimals. A geometry test verifies all 330 points are inside their township polygons.

NASA POWER remains a point-based gridded dataset. Values are not township averages or local sensor readings; adjacent townships can share a grid cell. Township FIRMS aggregation is not connected and returns an unavailable state rather than presenting regional detections as township data.

The graph, sonification, statistics and source details use the same returned observations and selected location metadata. The existing AbortController and aborted-request guard now include townshipId, preventing older region/township responses from replacing a newer selection. Playback resets when the returned series changes.
