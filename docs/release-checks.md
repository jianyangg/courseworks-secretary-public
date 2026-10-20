# Release checks — October 20, 2026

The release organizes accessible coursework and a private reviewed guide through the same timeline, calendar, graded-work, and assessment views. The credential-free demo uses that interface with fictional data.

## Evidence

- A new Python 3.12 environment installed the public project and its test dependencies successfully. Package discovery explicitly includes application packages and excludes interface/data directories.
- All 44 public Python tests passed in the fresh environment. They cover task identity, submission state, preparation, source handling, host/timezone configuration, safe pagination, private guide validation, demo isolation, course essentials beyond deadlines, protected routes, and static assets.
- All 23 Node checks passed. They cover filtering, calendar calculations, graded deadlines, Aiken handoffs, assessment grouping/rendering, and recoverable API failures.
- Local HTTP and browser rendering returned the synthetic timeline and all referenced assets. The browser's Exams & projects view displayed the reviewed sample assessments with source links.
- A focused scan of release files and 70 historical public text blobs found no matches for Canvas-token/private-key patterns or known private course/student identifiers. This is a scoped check, not a comprehensive security audit.
- The preview is a 1600 × 1000 opaque PNG on a solid background with crop padding, below the 20 MB limit. It contains fictional coursework only.
- The Showcase description is 398 characters, including spaces and punctuation.

The sample course guide includes distilled grading, submission requirements, preparation, and course rules across fictional syllabi, assignment pages, and announcements. Its source links identify the corresponding sample context. The public course-review playbook describes how a coding assistant compiles the same kind of brief from an owner's authorized sources.

## Limits

Visual acceptance remains with the project owner. Live Canvas access, institution-specific behavior, and optional Vercel/Blob deployment were not revalidated during this release. The private production deployment was not changed. The app does not run AI automatically; deeper source review uses an external coding assistant.

The preview route intentionally shows the first two timeline date groups to retain padding. The normal demo shows the full sample.
