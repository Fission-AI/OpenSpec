# Sizing a change

A change is one outcome a reviewer can accept or reject in one sitting, and that can ship on its own.

**Start from what exists.** Read the related specs and code before planning. If the code already does part of the request, plan only the gap. If it does all of it, the change may be a spec update alone, or nothing at all.

**Split it when the parts:**
- could ship, or be rolled back, on their own (a refactor and the feature built on it);
- need different reviewers (a public API change and an internal cleanup);
- invite a yes to one part and a no to another.

**Keep it together when** one part is useless without the other.

When you split, say so before writing anything: name each change, what it delivers, and the order. Plan the first one; list the rest so the user can start them next. Never widen a change past the request; name what you left out instead.

**Name the change for its outcome**, in kebab-case and starting with a verb: `add-due-dates`, `fix-duplicate-archive`, `remove-legacy-export`.
