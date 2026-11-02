# Claim ledger usability and export-safety regression (2026-11-02)

The existing Source Claim Verifier now supports correcting a previously entered manual review **without deleting and retyping the record**. A revised row keeps its ReviewID, while its original content is unchanged until the user selects Save. Cancel edit and Clear current fields leave the original review row intact; Clear all reviews removes both saved rows and any unfinished input text. No data is retained on a server or in browser storage.

A plain TSV download is requested through the browser; this site **cannot confirm that a file was actually saved**. The interface now accurately says “Download requested,” and points the reader to browser downloads. Worksheet text that begins with spreadsheet formula characters is prefixed to avoid evaluation, while tabs, actual line breaks and literal backslashes have distinguishable escapes. Text import and CSV/TSV rendering behavior can vary across spreadsheet applications, and this is not a guarantee against malicious content in arbitrary external files.

**Editorial correction:** The fictional garden scenario now distinguishes “the eventual location is North Greenhouse” (UNSUPPORTED by the notes) from “the meeting location has already been confirmed” (CONTRADICTED, because the notes explicitly say it is not confirmed). That avoids teaching the wrong inference about an unknown fact.

Regression tests cover stable IDs, non-mutation during revisions, exact validation, untrusted TSV values and reader-facing control labels. A successful CI build does not, by itself, establish every mobile or browser interaction outcome. No real third-party model behavior or AdSense approval is claimed.
