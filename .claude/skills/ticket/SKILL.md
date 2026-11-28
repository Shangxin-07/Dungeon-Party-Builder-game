---
name: ticket
description: File a GitHub issue ("ticket") on the repository the user is working in, written from their description plus what the code shows, with any screenshots they attached, and added to the repo's project board if it has one. Use when the user types /ticket, or starts a message with "ticket" / "ticket:", or asks to raise, open, log or file a ticket or issue (e.g. "log this as a bug", "make a ticket for that"). Drafts the issue, shows it, and files it with gh only after the user confirms.
argument-hint: <what the ticket is about>
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
-->

# /ticket: file a GitHub issue for the current repo

The user's request: $ARGUMENTS

If that is empty, the ticket is about whatever the conversation was just discussing (a bug you
found, a TODO you agreed to leave for later). If there is nothing to go on, ask what the ticket
is about and stop.

If the user lists several separate problems or ideas, make one ticket for each. Draft them all
and confirm them together.

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
  details the text leaves out. Keep the paths for step 6. If an attached image has no file path
  you can reach, tell the user they'll need to drag it into the issue themselves. Never put
  local paths in the issue.
- **Duplicates:** run `gh issue list --state all --search "<2-4 keywords>" --limit 5`. If you
  find a likely duplicate, say so in the draft.
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

If there are screenshots, end the body with `**Screenshots**: in the comments below.`

Rules for the body:
- Only state what you know. If something is unknown, such as the exact repro steps, write
  "Not yet known" rather than inventing it.
- Link code as GitHub URLs. If `HEAD` is on the remote, use permalinks:
  `<repo url>/blob/<full sha>/<path>#L<start>-L<end>`. If it isn't, use the default branch.
- Never include secrets, tokens, `.env` values, personal details, or local paths such as
  `C:\Users\...` or `/home/...`.
- Don't assign anyone, and don't set milestones, unless the user asks.

## 4. Show the draft and confirm

Show:
- the repo (`owner/name`),
- the title, the labels and the full body,
- the project board it will go on, if any,
- how many screenshots will be added, and
- any likely duplicates.

Then ask with the AskUserQuestion tool, giving these options:
- "File it (Recommended)"
- "Change something first": apply the user's edits and show the draft again.
- "Cancel"

Don't file anything until the user picks "File it". Issues are visible to everyone with access
to the repo.

## 5. File it

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

Reply with the issue number, its URL, and the board column it's in.

## 6. Add the screenshots

The GitHub CLI can't upload images. Instead, the user pastes each one into a comment on the
issue, and GitHub hosts it like a normal drag-and-drop upload.

1. Copy the first image to the clipboard, using the command for the user's system. Use the
   image's full path.
   - **Windows** (works from PowerShell or Git Bash):
     `powershell -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile('<full path>'))"`
   - **macOS:** `osascript -e 'set the clipboard to (read (POSIX file "<full path>") as «class PNGf»)'`
     Use `«class JPEG»` for a .jpg file.
   - **Linux:** `xclip -selection clipboard -t image/png -i "<full path>"`, or
     `wl-copy < "<full path>"` on Wayland.

   If the copy fails, tell the user where the image file is so they can drag it in instead.
2. Open the issue in the user's browser: `gh issue view <number> --repo <owner/name> --web`.
3. Tell the user: "Click the comment box at the bottom of the issue, paste (Ctrl+V, or Cmd+V on
   a Mac), and wait for the upload to finish."
4. Ask with AskUserQuestion.
   - If more images remain, give the options "Pasted, copy the next one" and "Skip the rest".
   - For the last image, give "Pasted and posted the comment" and "Skip it".
   - Before the last image, remind the user to click **Comment** after pasting it. For a single
     image, give that reminder with step 3.
5. Check that it worked: run
   `gh issue view <number> --repo <owner/name> --json comments --jq ".comments[].body"`
   and look for an image link (`user-attachments` or `![`). If it's missing, say so plainly.

## Project boards

New issues in these repos go on the board listed for them. Any other repo gets the issue only,
with no board.

| Repo | Board | Owner | Number |
|---|---|---|---|
| Shangxin-07/Dungeon-Party-Builder-game | [Dungeon Party Builder Game](https://github.com/users/Shangxin-07/projects/1) | Shangxin-07 | 1 |

To add a board for another repo, add a row. The owner and number come from the board's URL:
`https://github.com/users/<owner>/projects/<number>`, or `https://github.com/orgs/<owner>/projects/<number>`
for an organisation's board.
