"""Fictional examples of course essentials distilled from several sources."""

DEMO_SOURCE = "https://github.com/jianyangg/courseworks-secretary-public/blob/master/docs/demo.md"

_BRIEFS = {
    "Machine Learning": {
        "anchor": "machine-learning",
        "summary": "Individual problem sets and a midterm lead into a final model report. Show your reasoning and make every result reproducible.",
        "grades": "Problem sets 40% · midterm 30% · final model report 30%.",
        "requirements": [
            ("Submit a PDF write-up and an executed notebook on Canvas. Include the reasoning, not just the answer.", "assignments"),
            ("Discuss approaches, but write your own solutions and acknowledge outside help.", "syllabus"),
            ("Late problem sets lose 10% per day for up to two days; later submissions receive no credit.", "syllabus"),
        ],
        "change": "The midterm permits one handwritten reference sheet. Devices and online notes are not permitted.",
    },
    "Data Visualization": {
        "anchor": "data-visualization",
        "summary": "Build clear, accessible visual explanations. The final dashboard is half the grade; document the data and the decisions behind the design.",
        "grades": "Chart assignments 30% · final dashboard 50% · studio critiques 20%.",
        "requirements": [
            ("Submit the dashboard link, source files, data notes, and a short walkthrough on Canvas.", "assignments"),
            ("For the dataset story, include one chart and a 200-word explanation of the visual encoding.", "assignments"),
            ("Attend critiques and give feedback. Use readable labels and alternatives to color alone.", "syllabus"),
        ],
        "change": "Aggregate or remove personal records before publishing a dashboard. Include the data source and cleaning decisions in the data notes.",
    },
    "Design Studio": {
        "anchor": "design-studio",
        "summary": "Develop one project through a proposal, tested prototype, and final showcase. Evidence from testing matters alongside the finished design.",
        "grades": "Proposal 15% · prototype 25% · final showcase 50% · critiques 10%.",
        "requirements": [
            ("Submit a short proposal brief, one early prototype, and the questions to test next.", "assignments"),
            ("Test with at least three participants and show what changed in response to their feedback.", "syllabus"),
            ("Work in teams of two or three; name each member's contribution in the final reflection.", "syllabus"),
        ],
        "change": "The final showcase needs a working prototype and a reflection on the design decisions. A slide deck alone is insufficient.",
    },
}


def demo_course_brief(course: dict) -> dict:
    brief = _BRIEFS[course["course_code"]]

    def source(kind: str) -> str:
        return f"{DEMO_SOURCE}#{brief['anchor']}-{kind}"

    return {
        "id": str(course["id"]), "title": course["name"], "shortTitle": course["name"],
        "colorKey": course["course_code"], "subtitle": "Essential information distilled from fictional course sources.",
        "courseUrl": source("syllabus"), "sourceLabel": "Sample course brief",
        "sources": [
            {"label": "Sample syllabus", "url": source("syllabus")},
            {"label": "Sample assignments", "url": source("assignments")},
            {"label": "Sample announcement", "url": source("announcement")},
        ],
        "sections": [
            {"label": "At a glance", "note": brief["summary"]},
            {"label": "What counts", "bullets": [{"text": brief["grades"], "url": source("syllabus")}]},
            {"label": "Must know", "bullets": [
                {"text": text, "url": source(kind)} for text, kind in brief["requirements"]
            ]},
            {"label": "Latest clarification", "bullets": [{"text": brief["change"], "url": source("announcement")}]},
        ],
    }
