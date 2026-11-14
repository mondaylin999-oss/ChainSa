# Contributor frontend integration

The remote main branch already contained merge commits 9d1b790 and 4480536 combining the contributor redesign (257c305) with the existing EARTHBEAT work (1fee321). There were no unresolved Git conflict markers or open pull requests at integration time. The remaining conflict was functional: the new page used a separate graph and reported township records as unavailable.

The redesigned Home and Explore Map views, topic rail, data catalogue, live observation API, indicator details and chat design remain the primary interface. The new explorer now uses the existing handover chart, statistics and looping audio engine. The map loads bundled township geometry on demand, filters it to the selected region, blurs other regions and supports township focus and return navigation. API catalogue metadata distinguishes township map coverage from regional observation coverage.

Browser bundles use public status messages. Provider credentials remain in server modules. Shared environmental imports resolve directly as TypeScript in Next.js and continue to support the standalone adapter build.

Validation includes the production build, full test suite, browser-bundle secret check and a browser review of live observations, township boundaries, chart selection and floating chat.
