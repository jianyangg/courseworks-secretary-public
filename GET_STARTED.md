# Make CourseWorks Secretary useful for your courses

The example dashboard uses fictional courses. Use this project with ChatGPT to organize your own deadlines and distill scattered course instructions into the essentials.

## Set up the dashboard with ChatGPT Work

Use **Work in the ChatGPT desktop app**, with access to the project folder and approved local tools. Availability and allowed tools vary by account. See the official [local project guide](https://learn.chatgpt.com/docs/projects#use-local-projects-for-folders-and-codebases) and [Work guide](https://learn.chatgpt.com/docs/get-started-with-work).

1. **Download the project.** Open [the GitHub project](https://github.com/jianyangg/courseworks-secretary-public), select **Code → Download ZIP**, and unzip it into a folder you can find.
2. **Open that folder in ChatGPT.** In the desktop app, add the downloaded folder as a local project. Start a ChatGPT **Work** task with access to that folder and the local tools needed for setup.
3. **Paste this request:**

> Help me set up CourseWorks Secretary for my courses. Read GET_STARTED.md, README.md, and TECHNICAL_SETUP.md. Check what my computer needs, handle the technical steps, and start with the fictional demo. Help me connect Canvas using my school's permitted access method and enter credentials through private local prompts. Then follow COURSE_GUIDE_UPDATE.md to review the course sources I authorize and distill the important requirements and deadlines into my private guide. Show source links and conflicts for review before applying changes. Keep credentials and personal course content out of Git.

4. **Follow the setup prompts.** ChatGPT can explain the steps and help with installation. Enter account secrets through the local setup prompts. Once your courses load, ask it to review the full syllabi, assignment instructions, announcements, and other authorized sources.

## Start with a course brief instead

Add syllabi, assignment instructions, announcements, and accessible course links to a ChatGPT chat or [project](https://learn.chatgpt.com/docs/projects). Ask:

> Read these course materials and create a short course-by-course brief. Include only what affects my work or grade: deadlines, grading weights, submission requirements, preparation, and key rules. Merge repeated instructions, distinguish optional advice, link each requirement to its source, and flag conflicts or missing information. Do not invent dates or requirements.

This produces a brief from the supplied sources. A running dashboard and live Canvas syncing require the project setup above.

## Can I use ChatGPT Sites?

Sites can build and host dashboards inside ChatGPT. This Python/FastAPI application has not been validated there, so ask ChatGPT to assess compatibility and required changes before adapting it. Check who can access the course data and how updates work. See [creating a Site](https://learn.chatgpt.com/docs/sites/creating-a-site) and [data and hosting features](https://learn.chatgpt.com/docs/sites/data-and-connections).

## Other setup options

Codex and Claude Code can use the same setup request. For commands and optional personal hosting, follow [technical setup](TECHNICAL_SETUP.md).
