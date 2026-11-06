# OpenLane — Searchable Listing Dashboard

A responsive opportunity board built for the CodeNova Frontend Development Task 4. It uses a local JSON dataset and vanilla HTML, CSS and JavaScript.

> **Dataset note:** The opportunities and organisations in `listings.json` are fictional sample entries created for this frontend exercise. They are not live vacancies or endorsements.

## Features

- Fetches 16 listing records from `listings.json` using the Fetch API.
- Live search across title, company, domain, experience level, location, type, description, skills and keywords.
- Debounced search input (280 ms) to avoid filtering on every keystroke.
- Domain, experience and remote-only filters.
- Combined filters use logical **AND**: every active condition must match.
- Sort by newest, oldest, title A–Z and title Z–A.
- Six cards per page with working pagination.
- Save/unsave listings; saved IDs persist in localStorage.
- Loading, empty and fetch-error states, with retry and reset actions.
- Responsive layout, keyboard shortcut `/` to focus search, accessible labels and visible focus styles.

## Run locally

Because the page fetches a JSON file, do not open `index.html` directly using a `file://` URL.

1. Open this folder in Visual Studio Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` and choose **Open with Live Server**.
4. The dashboard should open in your browser.

## How search works

The search input is normalised with `trim()` and `toLowerCase()`. For each listing, the searchable fields are combined into one text string. `includes()` checks whether the query appears in that string. This is a straightforward substring search, suitable for this small client-side dataset.

The input event starts a 280 ms debounce timer. If the user types again before the timer finishes, the previous timer is cancelled. This avoids running the filter-and-render cycle repeatedly while the user is still typing.

## Filter logic

Each listing is checked against the search query, selected domain, experience level, remote-only option and (when active) saved-list filter. The conditions are joined with `&&`, so a listing must satisfy **all** selected criteria. Changing a filter resets the page to 1 to avoid landing on an empty page after the result set becomes smaller.

## Sorting and pagination

Filtering happens before sorting. The selected sort mode orders the matching array by date or title. Pagination then takes a slice of six records for the current page. The page controls are recalculated from the filtered result count.

## UI states

- **Loading:** shown while `fetch()` is waiting for the JSON response.
- **Success:** listing cards and result count appear after valid data is received.
- **Empty:** shown when no records match the current criteria.
- **Error:** shown if the JSON request fails or the dataset is invalid; the user can retry.
- **Saved:** saved listing IDs are stored locally in the browser using `localStorage`.

## Project structure

```text
task-4-searchable-listing-dashboard/
├── index.html
├── style.css
├── script.js
├── listings.json
└── README.md
```

## Before submission

- Test the search and each filter separately, then test them together.
- Test all sort options and navigate between pages.
- Search for a term that returns no results to check the empty state.
- Temporarily rename `listings.json` to test the error and retry states, then restore the filename.
- Check the layout at mobile, tablet and desktop widths.
- Add screenshots of your own running project to this README or repository.
- Publish the repository publicly and deploy it with GitHub Pages.
- Do not describe the fictional dataset as real job openings.
