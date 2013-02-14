PiCL Tab Store
==============

This is an experimental server for storing a user's tabs.  It's part of the
Profile-in-the-Cloud project.  See here for more high-level project details:

  https://wiki.mozilla.org/Identity/AttachedServices



Initial Dummy API
-----------------

To help us get something stood up quickly, the first version of this server
just allows storing of a single JSON blob per device.  It's unencrypted and
unstructured.  The URL space looks like this:

  https://[server-url]/tabs/[userid]/[device]

(There are some additional URLs for the standard PICL login flow, monitoring,
etc).

You can GET and PUT to the record for any device to store an arbitrary JSON
blob.  You can GET from the root <userid> component to get a list of all
devices.  That's about it.

Each user's data has a "version number" that increases whenever something
is changed.  You can use this for a primitive kind of change-detection.
Doing a GET to the user's data root gives you a list of devices and the
version number of their last change, like this:

    > GET /tabs/myuser

    < { "version": 123,
    <   "devices": {
    <      "my-desktop-firefox": 120,
    <      "my-android-firefox": 123
    < }}

You can then query just those devices that have a version number greater than
what you last saw:

    > GET /tabs/myuser/my-android-firefox

    < { "version": 123,
    <   "tabs": { ... tab data here ... }
    < }



Suggested Future API
--------------------

(These are just notes at this point, nothing concrete or implemented)

Each user has their own namespace.  Within that is a bucket for each device,
and within that is a record for each individual tab that is open on that
device.  Thus the URL space looks like this:

  https://[server-url]/tabs/[userid]/[device]/[tabid]

(There are some additional URLs for the standard PICL login flow, monitoring,
etc).

Tabs are numbered from 0 to N, so basically they form a list for each device.
Devices pick their own id by some unspecified means, and we assume it will
be unique.

The data under each tab record is a JSON blob with no assumed structure.  We
might expand on its structure in the future, at least specifying some mandatory 
keys.

The state of a user's data at any particular time is identified by a *version*.
It's an opaque string.  You can think of it as a global revision number for the
user's data, but I'm not making any guarantees about its format.

Writing new tab data changes the version identifier.

You can PUT data to an individual tab record.  You can PUT or POST data to the
bucket for a particular device.  The writes can be conditional using the
version identifier as an etag.

You can GET the root, a device, or an individual tab.  You can use the version
identifier as an etag for conditional gets.  You can also request a "diff"
from a given version identifier to the current one, which might produce less
network traffic.  Probably this uses a GET variable like "diff\_from=<version>"
and sends just the things that have changed as a JSON document.


Open Questions
--------------

How do we name/identify tabs?
  - Can we identify tabs by their position in the list? like 0, 1, etc.
    This makes some things harder, e.g. when we close tab #0, how do we
    efficiently communicate that to "replace" tabs 1, 2, etc.
  - Alternatively, give each tab a GUID and store a list of GUIDs to specify
    the ordering of the tabs

What data are we going to store about each tab?
  - current URL
  - current page stage e.g. form contents, scroll position, etc?
Is there any useful information we can store at the device level, e.g.
extra data from sessionstore.js that should be persisted for each device?

what max number of tabs do we expect per device?  Will we limit this somehow?

How do we expire records after some period of time, to deal with device that
have gone away?  This feeds into broader questions of device management in
PICL that have not been resolved yet.
