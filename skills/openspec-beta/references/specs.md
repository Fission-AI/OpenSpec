# Writing a requirement

A requirement is one promise someone relies on, named after that promise, in a sentence or two. Its cases, failures included, are its scenarios.

**Who reads it:** a reviewer deciding yes or no, a test named after a scenario, and the next agent to change it. So a requirement has to stand on its own, and be changeable on its own.

**The spec is an outline.** Read the requirement headings top to bottom and they say what the capability promises. A heading that does not name something the system does for someone is a section, not a requirement.

**One promise each.** One SHALL in the statement. A second "and SHALL ..." is a second promise: give it its own requirement, or make it a scenario if it is a case rather than a promise.

**Where new behavior goes.** Ask whether it is a new promise or a change to an existing one: ADDED for a new promise, MODIFIED for a changed one. Appending a clause to a requirement that promises something else is neither, and it is how requirements grow.

**Never leave one more crowded than you found it.** A MODIFIED block carries the whole requirement, so a new clause is easy to add and the rest comes along. If the new behavior is a separate promise, give it its own requirement instead of widening this one. Splitting a requirement you are already editing is welcome; reshaping ones you are not touching is not.

**Not in a requirement:** file or symbol names, framework settings, component responsibilities, test procedures, or code-structure rules. Those belong in the design, the tasks, or the project's config.
