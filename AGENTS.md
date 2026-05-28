# Project Collaboration Notes

- After completing code or documentation changes, commit the finished work and push it to `origin/main`.
- After changes that affect the public game experience, sync the local deployment copy and personal homepage copy before final verification:
  - Run `./scripts/sync-local-deploy.sh` to update `/Users/djangomei/textgame-service`.
  - Run `./scripts/sync-homepage-static.sh` to update `/Users/djangomei/Documents/个人主页/textgame`.
  - Restart the backend with `launchctl kickstart -k gui/$(id -u)/com.djangomei.textgame` when server-side code or environment-dependent behavior changed.
  - Verify `https://djangomei.com/textgame/` and `https://api.djangomei.com/api/llm` after syncing.
- Do not commit secrets, local `.env` files, logs, build output, recovery caches, or other ignored local artifacts.
- If verification fails or GitHub push is blocked, report that clearly instead of pushing a questionable state.
