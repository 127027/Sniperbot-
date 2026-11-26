# Cleanroom data watchdog (PAPER_ONLY research)
## Purpose
Independent market-data, pool, security and news acquisition. Not a GPT process, not a strategy, no orders. The GitHub job runs one bounded collector cycle per scheduled, relevant code-push or manual dispatch. Cron is every ten minutes (UTC minutes 4,14,24,34,44,54); scheduled starts are best-effort only. The 2026-11-26 investigation found no recorded scheduled market-collector runs despite successful push-triggered runs. The cron was changed to re-register it; this is not proof that future scheduled events will execute. A post-publish gate checks the checkpoint run ID, successful cycle, snapshot age (<=5 minutes), consistent candidate pages and at least one research-ready positive EUR quote with a provider timestamp <=15 minutes old. A green job is not a guarantee of complete coverage or continuous availability. No promise of a perpetual GitHub job.
## Durable alternative on Windows laptop
Requires Node.js 22+, Git and authenticated GitHub write access for the repository. Use a **separate dedicated clean checkout**, not the app working directory:
```powershell
git clone --branch main https://github.com/127027/Sniperbot-.git Sniperbot-collector
cd Sniperbot-collector
git config user.name "Cleanroom collector"
git config user.email "collector@users.noreply.github.com"
node research/cleanroom/market-probe.mjs --self-test
node research/cleanroom/evidence.mjs --self-test
node research/cleanroom/targeted.mjs --self-test
node research/cleanroom/token-registry.mjs --self-test
node research/cleanroom/watchdog.mjs --once --publish
```
This is a one-cycle bounded test. Before enabling laptop publishing, disable the cloud collector workflow through GitHub Actions and confirm that no other collector run is in progress; do not run concurrent publishers. After validating the local test use `node research/cleanroom/watchdog.mjs --continuous --publish`. For a persistent laptop runner, configure Windows Task Scheduler to start that command on login/startup, restart on failure, and prevent concurrent instances; keep laptop awake. Git auth must be configured separately, never put credentials in tracked files. No OpenAI API key.
## Verification
Read research/cleanroom/watchdog-checkpoints.json and targeted-latest.json. Each sample has actual start/end, source outcomes and summary. Check quote age at handoff and not just collector age. A successful fetch is not a verified BUY. Some sources may fail or return incomplete security data. Missing fields are unknown, not evidence of safety. Kraken trade fallback requires an explicit verified asset-ID/EUR pair mapping. GeckoTerminal fallback uses completed minute-candle close and dated indicative FX, never fakes provider timestamps. Do not treat either as a guaranteed DEX fill.
## Outstanding
A continuously executing GPT Dot is not established by these data heartbeats. Hourly Dot execution can read persistent data and previous verified decisions; autonomous between-hour KI decisions require independently supported execution and evidence. No code here starts or supervises a GPT process. Local watchdog was not installed or run on the user's laptop by this change.
