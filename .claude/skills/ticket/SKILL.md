---
name: ticket
description: File a GitHub issue ("ticket") on the repository the user is working in, written from their description plus what the code shows, with any screenshots they attached shown in the issue, and added to the repo's project board if it has one. Use when the user types /ticket, or starts a message with "ticket" / "ticket:", or asks to raise, open, log or file a ticket or issue (e.g. "log this as a bug", "make a ticket for that"). Shows the draft for review first, unless auto-file is on ("/ticket auto on"), and files it with gh.
argument-hint: "[--auto | --review] <what the ticket is about>   or   auto on | auto off"
---

<!--
HOW TO INSTALL (for the person receiving this file)

1. If this file came with a repo (at .claude/skills/ticket/SKILL.md), Claude Code
   already loads it for anyone working in that repo, so skip to step 2. To use it
   in every repo, save it as  ~/.claude/skills/ticket/SKILL.md
   (on Windows: %USERPROFILE%\.claude\skills\ticket\SKILL.md).
2. Install the GitHub CLI (https://cli.github.com), then run:
     gh auth login
     gh auth refresh -s project      <- lets it put issues on project boards
3. Ask the repo owner for write access to the repo and to the project board
   listed under "Project boards" at the end of this file. The board is private.
4. Start a new Claude Code session in the repo and type:  /ticket <what's wrong>
   Attach screenshots to the same message if you have them.

Every ticket is shown for review before it's filed. To skip the review and file
straight away, type  /ticket auto on  (and  /ticket auto off  to go back). That
setting is yours alone: it's kept in ~/.claude/ticket-settings.json.
-->

# /ticket: file a GitHub issue for the current repo

The user's request: $ARGUMENTS

## 0. Review or auto-file

The setting lives in `~/.claude/ticket-settings.json`, for example `{"autoFile": true}`. If the
file is missing or unreadable, auto-file is **off**, so every ticket is reviewed first.

- **The request is just `auto on`, `auto off` or `auto`:** turn auto-file on or off by writing
  that file, or report its current state for a bare `auto`. Say in one line what it now does,
  then stop. Don't file anything.
- **The request starts with `--auto`:** auto-file this ticket, whatever the setting says. Remove
  the flag from the request.
- **The request starts with `--review`:** review this ticket first, whatever the setting says.
  Remove the flag from the request.
- **Otherwise:** follow the setting.

If the request is empty, the ticket is about whatever the conversation was just discussing (a
bug you found, a TODO you agreed to leave for later). If there is nothing to go on, ask what the
ticket is about and stop.

If the user lists several separate problems or ideas, make one ticket for each. Draft them all,
and when reviewing, confirm them together.

## 1. Find the repo

Run `gh repo view --json nameWithOwner,url,hasIssuesEnabled,defaultBranchRef`.

Stop and tell the user plainly if:
- `gh` isn't installed (point them to https://cli.github.com),
- `gh` isn't logged in (tell them to run `gh auth login`),
- the folder isn't a GitHub repo, or
- issues are turned off for the repo.

Check whether the repo is listed under **Project boards** at the end of this file.

## 2. Gather the details (keep it quick: a handful of searches and reads, not an audit)

- **Code:** find the files and functions the ticket is about, and note them with line numbers.
- **Screenshots:** collect the images the user attached to their /ticket message, or to the
  messages just before it. Pasted images usually come with a note giving their file path.
  Also collect any image file paths the user named. Look at each image, because it often shows
  details the text leaves out. For each one, write a short descriptive file name, for example
  `pick-the-party-still-waiting.png`, and alt text saying what it shows. If an attached image
  has no file path you can reach, tell the user to save it to a file and give you the path, or
  drag it into the issue themselves afterwards. Never put local paths in the issue.
- **Duplicates:** run `gh issue list --state all --search "<2-4 keywords>" --limit 5`.
- **Templates:** if `.github/ISSUE_TEMPLATE/` exists, follow the structure of the matching
  template.
- **Labels:** run `gh label list`. Use only labels that already exist (usually `bug`,
  `enhancement` or `documentation`). Never create new labels.
- **Version:** note the current commit, from `git rev-parse --short HEAD` and
  `git branch -r --contains HEAD`.

## 3. Write the draft

**Title:** short and specific, under about 70 characters. Name the thing, not the feeling.
For example, "Gold counter resets to 0 after leaving a delve", not "Gold bug".

**Body:** Markdown, using the layout for the kind of ticket.

Bug:
- **Summary**: one or two sentences.
- **Steps to reproduce**: numbered.
- **Expected** and **Actual**.
- **Where in the code**: links to the relevant lines, with one line on why each matters.
- **Version**: the commit, plus the browser or OS if that's relevant.

Feature or task:
- **Summary**: what, and who it's for.
- **Why**: the problem it solves.
- **Suggested approach**: brief. Leave it out if the user didn't ask for one and it isn't obvious.
- **Where in the code**: links to the relevant lines.
- **Done when**: checkbox list of acceptance criteria.

If there are screenshots, end the body with a `**Screenshots**` section holding one image line
per screenshot. You'll fill in the URLs in step 5.

Rules for the body:
- Only state what you know. If something is unknown, such as the exact repro steps, write
  "Not yet known" rather than inventing it.
- Link code as GitHub URLs. If `HEAD` is on the remote, use permalinks:
  `<repo url>/blob/<full sha>/<path>#L<start>-L<end>`. If it isn't, use the default branch.
- Never include secrets, tokens, `.env` values, personal details, or local paths such as
  `C:\Users\...` or `/home/...`.
- Don't assign anyone, and don't set milestones, unless the user asks.

## 4. Review (skip when auto-filing)

**When reviewing,** show:
- the repo (`owner/name`),
- the title, the labels and the full body,
- the project board it will go on, if any,
- the screenshots it will include, and
- any likely duplicates.

Then ask with the AskUserQuestion tool, giving these options:
- "File it (Recommended)"
- "Change something first": apply the user's edits and show the draft again.
- "Cancel"

Don't upload or file anything until the user picks "File it".

**When auto-filing,** go straight to step 5, with two exceptions. Stop and review as above if:
- a search found a likely duplicate, or
- the request is too vague to write a useful ticket.

## 5. Upload the screenshots

The GitHub CLI can't attach images to issues. Instead, the images go on the repo's
`ui-test-shots` branch, which holds images only, shares no history with main and is never
merged. The issue then links to them, and they show inline to anyone who can see the repo. Every
commit message carries `[skip ci]`, so uploads don't start CI runs.

Use one folder per ticket, named by the time (`yyyyMMdd-HHmmss`). Each image goes to
`<folder>/<file name>`.

1. **Check that the branch exists:** `gh api repos/<owner/name>/branches/ui-test-shots --jq .name`.
   If that returns 404, create the branch, and tell the user you did:
   ```bash
   R=<owner/name>
   BLOB=$(gh api repos/$R/git/blobs -f encoding=utf-8 -f content='Images shown in this repo issues (the /ticket skill). Never merged.' --jq .sha)
   TREE=$(echo "{\"tree\":[{\"path\":\"README.md\",\"mode\":\"100644\",\"type\":\"blob\",\"sha\":\"$BLOB\"}]}" | gh api repos/$R/git/trees --input - --jq .sha)
   COMMIT=$(echo "{\"message\":\"Start the ui-test-shots branch [skip ci]\",\"tree\":\"$TREE\",\"parents\":[]}" | gh api repos/$R/git/commits --input - --jq .sha)
   echo "{\"ref\":\"refs/heads/ui-test-shots\",\"sha\":\"$COMMIT\"}" | gh api repos/$R/git/refs --input -
   ```
2. **Upload each image.** The request body goes through a temp file, because an image's base64
   is too long for a command line.
   - **bash** (macOS, Linux, or Git Bash on Windows):
     ```bash
     R=<owner/name>; F="<image path>"; DEST=<folder>/<file name>
     J=$(mktemp)
     printf '{"message":"Shot %s [skip ci]","branch":"ui-test-shots","content":"%s"}' "$DEST" "$(base64 < "$F" | tr -d '\n')" > "$J"
     gh api -X PUT "repos/$R/contents/$DEST" --input "$J" --jq .content.path; rm -f "$J"
     ```
   - **PowerShell** (Windows):
     ```powershell
     $R='<owner/name>'; $F='<image path>'; $D='<folder>/<file name>'
     $J=[IO.Path]::GetTempFileName()
     [IO.File]::WriteAllText($J, (@{message="Shot $D [skip ci]"; branch='ui-test-shots'; content=[Convert]::ToBase64String([IO.File]::ReadAllBytes($F))} | ConvertTo-Json -Compress))
     gh api -X PUT "repos/$R/contents/$D" --input $J --jq .content.path; Remove-Item $J
     ```
3. **Add each image to the body's Screenshots section:**
   `![<alt text>](https://github.com/<owner/name>/blob/ui-test-shots/<folder>/<file name>?raw=true)`

If an upload fails, show the error, file the issue without that image, and say so.

## 6. File it

Write the body to a temporary file (in your scratchpad directory if you have one). Then run:

```
gh issue create --repo <owner/name> --title "<title>" --body-file "<temp file>" --label <label>
```

Pass one `--label` per label. Use `--body-file`, not `--body`, so quotes and backticks in the
body survive the shell. If the title contains double quotes, escape them for the shell you're
using.

If `gh` fails, show its error and don't retry blindly. For example, a missing label means you
should drop it and ask, not create it. If labels fail because the user lacks permission on the
repo, file the issue without labels and tell them.

**Board:** if the repo is listed under **Project boards**, add the new issue to that board and
put it in the Todo column:

1. Get the board's IDs:
   - `gh project view <number> --owner <owner> --format json`: the `id` field is the project id.
   - `gh project field-list <number> --owner <owner> --format json`: find the field named
     `Status`, then its option named `Todo`.
2. Add the issue: `gh project item-add <number> --owner <owner> --url <issue url> --format json`.
   The `id` in the result is the item id.
3. Set its column:
   `gh project item-edit --id <item id> --project-id <project id> --field-id <Status field id> --single-select-option-id <Todo option id>`

If the board steps fail:
- **Missing `project` scope:** tell the user to run `gh auth refresh -s project`, then retry.
- **"Could not resolve to a ProjectV2" or a permissions error:** the user doesn't have access
  to the board. Tell them to ask the board owner to add them as a collaborator with Write
  access. The issue itself is filed either way.

**Reply** with the issue number, its URL and the board column. When the ticket was auto-filed,
also give the title, the labels and a one-line summary of the body. That's the user's chance to
catch a mistake, and they can ask you to edit the issue.

## Project boards

New issues in these repos go on the board listed for them. Any other repo gets the issue only,
with no board.

| Repo | Board | Owner | Number |
|---|---|---|---|
| Shangxin-07/Dungeon-Party-Builder-game | [Dungeon Party Builder Game](https://github.com/users/Shangxin-07/projects/1) | Shangxin-07 | 1 |

To add a board for another repo, add a row. The owner and number come from the board's URL:
`https://github.com/users/<owner>/projects/<number>`, or `https://github.com/orgs/<owner>/projects/<number>`
for an organisation's board.
