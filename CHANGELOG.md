# [2.1.0](https://github.com/ehealthafrica/chat-dhis2-app/compare/v2.0.0...v2.1.0) (2026-03-26)

### Features

* add report date capture flow using `occurredAt` for tracker events and hide organisation unit selection on completed event review
* support grouped saved progress per user and program, with unique draft entries by organisation unit and report date
* show tracker events from DHIS2 descendants together with drafts in the capture list, including creator and updater details
* resolve tracker event organisation unit ids to display names in the events list and completed event form
* add coordinate capture support in the data entry form with editable latitude and longitude and current-location autofill
* redesign capture home, capture list, and capture form layouts with stronger card structure and updated responsive styling

### Bug Fixes

* remove completed-event dependency on datastore context and read completed records directly from the DHIS2 tracker events endpoint
* fix completed event report date display by normalizing `occurredAt` values for date inputs in the capture form
* fix descendant event loading and tracker event query parameters for organisation unit scoped data capture views
