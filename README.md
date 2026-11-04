# pgs_archive_bot

The Telegram bot behind the [Postgrowth Singapore resources archive](https://hclovecraft00.github.io/pgs-archive/) ([site code](https://github.com/hclovecraft00/pgs-archive)).

Admins forward a link (or a PDF) to the bot, tap a type and up to two themes, and it's added to the **Entries** tab of a Google Sheet as live. The website reads that tab, so it shows up within a few minutes.

It's a Google Apps Script attached to the Sheet. No server, no AI, no cost.

## What it does

- Reads the page it's sent (title, description, and for papers the authors and year from citation tags).
- Buttons for type (research, book, article, podcast, video, community, post, zine / own writing), theme 1 and theme 2, or a new theme typed on the spot.
- Optional: edit title, description, date/authors, extra tags, and who shared it (with a yes/no on crediting them).
- PDFs are saved to a Drive folder shared as "anyone with the link can view".
- Warns about links already in the archive. Saves a Wayback Machine snapshot of each new link (hourly).
- `/recent`, `/hide`, `/show`, `/invite` (one-time link for another admin), `/cancel`.

## Sheet tabs

- **Entries** (published as CSV for the site): ID, Status (live/hidden), Title, Link, Type, Theme 1, Theme 2, Extra tags, Date, Authors, Description, Shared by, Date added, Archive link
- **Themes**, **Types**: lists the buttons are built from
- **Private** (not published): who shared what, whether they're OK to be credited, which admin added it

## Set up your own

1. Make a Google Sheet, open **Extensions → Apps Script**, and paste in `Code.gs` (or push it with [clasp](https://github.com/google/clasp)). Set the time zone in `appsscript.json`.
2. Make a bot with [@BotFather](https://t.me/BotFather) and add its token as the script property `BOT_TOKEN`.
3. Run `setup()` once. It creates the tabs, adds starter themes and types, makes the PDF folder and starts the bot.
4. Send `/start` to your bot. The first person to do so becomes its owner.
5. Publish the Entries tab to the web as CSV and point the site at it.

The bot checks Telegram once a minute (Apps Script web apps can't take Telegram webhooks), so replies can take up to a minute.
