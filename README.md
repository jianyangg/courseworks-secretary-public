# CourseWorks Secretary

See your CourseWorks deadlines, preparation, announcements, and course instructions in one private dashboard. It reads your own Columbia account and cannot submit or change coursework.

**There are two parts to getting useful results:** the app collects assignments and dates from CourseWorks, and your AI coding assistant reads course documents to build the fuller course guide. For example, it can find homework mentioned in an announcement before the instructor adds it to the assignment list.

## Start here — no programming knowledge needed

You need your Columbia CourseWorks account and an AI coding assistant that can work with files on your computer. A chat window alone may not be able to install or run the app.

1. On this GitHub page, select **Code → Download ZIP**. Open the downloaded ZIP to get the project folder.
2. Open that folder in your AI coding assistant. If you do not know how, ask it: “Help me open the CourseWorks Secretary folder I downloaded so you can set it up.”
3. Copy the request below into the assistant. It should handle the technical work and guide you through the few steps that require your account.

> Set up CourseWorks Secretary for me using README.md and TECHNICAL_SETUP.md. Explain each step in everyday language and handle the technical work yourself. Start by running it on my computer. Guide me through creating a CourseWorks access token and entering it privately, then choosing a dashboard password. Open the dashboard and verify that my courses load. Read my current announcements, syllabi, course pages, and linked documents to draft a course guide and timeline, including work missing from the assignment list. Show me the draft with source links before applying it. Follow PRIVATE_GUIDE_FORMAT.md to store the approved guide privately. Then explain this choice: use it only while it is running on my computer, or set up a password-protected website I can open from my phone or another computer. If I choose the website, guide me through the free Vercel Hobby setup and handle its settings and private storage. Show me what will be put online and get my approval before putting it online. Keep my credentials and course material out of chat, screenshots, logs, and the public project files. Do not ask me to choose technical settings I would not understand; explain the practical choice and recommend a suitable default.

## The steps you do yourself

Your assistant should give you one step at a time, tell you exactly where to click, and explain what success looks like.

- **Allow access to your courses.** Sign in to [CourseWorks](https://courseworks2.columbia.edu/), then open **Account → Settings → Approved Integrations → New Access Token**. A token is a private access code that lets the app read your account. Create one and enter it in the local settings file your assistant opens for you. Do not paste it into the conversation. If the option is missing, tell your assistant what you see.
- **Choose a dashboard password.** Enter it when the setup program asks. Use a different password from your Columbia login. Anyone who knows this dashboard password can see your course information.
- **Review the course guide.** Check the assistant’s proposed deadlines and instructions against its sources. It should flag missing or conflicting information instead of guessing. If a document needs a separate sign-in, it may ask you to open it or provide a copy you are allowed to use.
- **Optional: sign in to Vercel.** Vercel is the service that keeps your website available when your computer is off. Your assistant should guide you through creating your own account and storing your course information privately. [Its Hobby plan is free for personal projects](https://vercel.com/docs/plans/hobby), including [storage within the free usage limits](https://vercel.com/docs/vercel-blob/usage-and-pricing). Your AI assistant may have its own costs. You can skip this step and use the dashboard on your computer.

Setup is finished when you can open the dashboard, sign in, see your own courses, and see the approved guide and its dated tasks. If you chose a website, save its address and try it on your phone. Your assistant should also tell you how to reopen the app and refresh it later.

## Keep it up to date

**Use Sync for new CourseWorks records.** Sign in and select **Sync** to fetch assignments, dates, announcements, and links. An online installation also attempts this daily. The free hosting plan may run that update at any point within the scheduled hour. Sync does not read documents for meaning or rewrite your reviewed course guide.

**Ask your assistant to review new instructions.** Do this at the start of a term and when instructors post new documents, announce work, or change requirements. This is how homework mentioned only in an announcement, required reading, submission rules, and conflicting deadlines become useful guide and timeline entries. The dashboard does not run an AI assistant automatically.

Copy this request into the assistant that has your project folder:

> Refresh my CourseWorks Secretary dashboard. Read current announcements, syllabi, course pages, and linked documents, and compare them with the assignment list. Find work or preparation mentioned only in those sources. Show me proposed course-guide and timeline changes with source links, and flag unclear dates or conflicting instructions. After I review and approve the changes, update my private guide using PRIVATE_GUIDE_FORMAT.md. If I have a website, update its private copy too. Handle the commands yourself and keep my credentials and course material out of the public project files.

Your guide is only as current as the last document review. If automatic updates fail, ask your assistant to check them; it should preserve your existing data while investigating.

## Optional task list

**Add to Aiken** opens [Aiken Dewit](https://aikendewit.com/) with the selected task’s details filled in for review. You decide whether to save it there. Using Aiken is optional.

## For technical users and AI assistants

See [technical setup](TECHNICAL_SETUP.md) for commands, website configuration, and privacy details, and [the private guide format](PRIVATE_GUIDE_FORMAT.md) for storing reviewed course instructions.

Each installation belongs to one CourseWorks account. This project contains no student courses or account data. Keep your access code and personal course files private, and have your assistant check both files and saved Git history before sharing a modified copy publicly.
