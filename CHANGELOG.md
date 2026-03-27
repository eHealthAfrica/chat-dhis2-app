## Unreleased

### Features

* add root `meta-data-packages` sample assessment packages for drought, flood, and heatwave imports
* update the DHIS2 app manifest with a new app id and raise the minimum supported DHIS2 version to `2.41`
* read assessment configuration and grouped draft progress from encrypted `dataStore/chat` resources
* move capture statistics and event submission further toward DHIS2 tracker API usage, including synchronous tracker bundle submission

### Bug Fixes

* add `rel="noreferrer"` to sidenav anchor links

### Documentation

* refresh the root and app READMEs with CHAT-specific product context, runtime requirements, metadata package guidance, and repository links
* add SVG mockup assets for capture list, capture home, and coordinate field layout exploration
* refresh the translation template with current guide, report date, and capture flow strings

# [2.1.0](https://github.com/ehealthafrica/chat-dhis2-app/compare/v2.0.0...v2.1.0) (2026-03-26)

### Features

* add report date capture flow using `occurredAt` for tracker events and hide organisation unit selection on completed event review
* support grouped saved progress per user and program, with unique draft entries by organisation unit and report date
* show tracker events from DHIS2 descendants together with drafts in the capture list, including creator and updater details
* resolve tracker event organisation unit ids to display names in the events list and completed event form
* add coordinate capture support in the data entry form with editable latitude and longitude and current-location autofill
* redesign capture home, capture list, and capture form layouts with stronger card structure and updated responsive styling
* add a stepped assessment import flow with review and organisation unit selection before import
* update assessment import preview sizing and related creation flow UI refinements
* add in-app guide pages for data capture and assessment setup with a dedicated `Guides` sidebar menu section
* add SVG mockup assets for guide illustrations covering capture home, event list, capture form, import review, and organisation unit assignment

### Bug Fixes

* remove completed-event dependency on datastore context and read completed records directly from the DHIS2 tracker events endpoint
* fix completed event report date display by normalizing `occurredAt` values for date inputs in the capture form
* fix descendant event loading and tracker event query parameters for organisation unit scoped data capture views
* cap app border-radius values at `10px` across updated chat UI surfaces

### Documentation

* update CHAT README content with current app overview, root `meta-data-packages` sample assessment package reference, and GitHub repository link
