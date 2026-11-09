# Make this dashboard yours

Canvas is the course platform; Columbia calls it [CourseWorks](https://courseworks.columbia.edu/about.html). You don't need to know how to code. A coding assistant does the technical steps while you answer its questions.

## What you need

- The **ChatGPT desktop app** with **Work** (it needs permission to use a folder on your computer; availability depends on your account, [details](https://learn.chatgpt.com/docs/projects#use-local-projects-for-folders-and-codebases)). Codex or Claude Code also work.
- Your Canvas login, and your syllabi or course pages.

## Three steps

1. **Download the project.** On [the GitHub page](https://github.com/jianyangg/courseworks-secretary-public), click **Code → Download ZIP**, then unzip it (on Windows, right-click → **Extract All**).
2. **Open the folder in ChatGPT.** Add the unzipped folder as a local project and start a **Work** chat.
3. **Paste this request:**

> Help me set up this course dashboard using TECHNICAL_SETUP.md. Show me the demo first. Then help me connect my Canvas account using a method my school allows, and keep secrets out of chat and public files. After that, follow COURSE_GUIDE_UPDATE.md to turn my course materials into a short guide with time estimates. Show me the sources and anything unclear before saving it.

ChatGPT will show you the demo, then ask for a few things along the way:

- **A Canvas access key.** It lets the app read your courses. Type it only into the hidden prompt ChatGPT opens on your computer, never into the chat. Treat it like a password.
- **A dashboard password.** Pick a new one; don't reuse your school password.
- **Your course materials**, so it can write your course guide. Check its draft before you approve it.

When it's done, open the dashboard link it gives you. Use the menu in the top-left corner to switch between Timeline, Calendar, Wave, Graded work, and Exams & projects. To see the views before setting anything up, [try the demo](docs/demo.md).

## Only want a course summary?

Skip the dashboard. Add your syllabi and course instructions to ChatGPT and ask:

> Summarize what I must do for each course: deadlines, grading, required submissions, preparation, and important rules. Link the sources and flag missing or conflicting information.

## What about ChatGPT Sites?

[Sites](https://learn.chatgpt.com/docs/sites/creating-a-site) can build dashboards, but this project hasn't been tested there. Ask ChatGPT what would need to change first.

Commands and online hosting are in [the technical reference](TECHNICAL_SETUP.md).
