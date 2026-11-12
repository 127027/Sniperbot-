# Critical UTC-day guard – historical 10 September 2024

The training is defined in UTC. A US-local **10 September** evening event can occur on **11 September UTC**.

**Contemporaneous source:** ABC News announced the September 10 Harris–Trump debate at **21:00 EDT**, which is **2024-09-11T01:00:00Z**:
https://abc.com/news/5e38600c-4732-4cd2-a99c-3dedfa81beb0/category/1138628
https://www.reuters.com/world/us/when-where-is-trump-harris-presidential-debate-2024-08-28/

**Direct as-of audit:** Wikipedia's 10 September Current Events page had an immutable revision at **2024-09-10T21:46Z**:
https://en.wikipedia.org/w/index.php?oldid=1245075863&title=Portal:Current_events/2024_September_10
This revision did not include the debate. Later page versions contain it. This is exactly why 2026 page content must not be assigned retroactively.

**Issue to verify, DO NOT silently rewrite history:** The Scout's `news_discovery.json` on `codex/dots-memecoin-training-only-20261112` filed `US presidential debate and contemporaneous reaction memes` on `virtual_day: 2024-09-10`. If this means **observed debate reactions**, this is an impossible UTC timestamp; the event had not started at the Sep 10 UTC cutoff. A dated pre-debate *announcement* is allowed earlier but must be recorded as the announcement, not later viral debate reactions.

**Required correction methodology:**
- preserve source and decision audit history; append a QA discrepancy/correction, never quietly replace old results;
- use timestamp with explicit timezone conversion, keep `event_at_utc` and separate `published_at_utc`, distinguish planned event from actual reactions;
- never assign post-2024-09-11T01:00Z reaction memes to Sep 10 UTC.
- The above is a **chronology defect** in one provisional clue, not evidence of a fraudulent trade; no BUY/SELL was executed.
- No selected target-memecoins or later ATH/winners exposed here.
