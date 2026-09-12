# Start Orbit manually

1. In Finder, open this project folder and double-click **Start Orbit.command**. Keep its Terminal window open. If Orbit is already running, skip this step.
2. Open Chrome. After code updates, open `chrome://extensions` and click Reload on Orbit, then refresh your website.
3. On an ordinary website, click Orbit in Chrome's extensions menu. If asked to connect, follow the local pairing screen.
4. Send your task. Orbit starts Steel Computer automatically. Send starts a new task; Resume continues the previous task.
5. To stop the local server, press Control+C in its Terminal window.

If double-click does not launch it, open Terminal and run:

```sh
cd '/Users/arushgupta/Documents/ChatGPT/Battle of The School'
zsh 'Start Orbit.command'
```

Deleted Steel computer IDs are now replaced automatically on connection. New computers pause after 15 minutes idle, with a one-hour maximum running window. Steel compute is billed separately from OpenAI. Do not delete a computer while a task is running. If Steel's service returns a gateway error, a local restart cannot guarantee that its service will recover.
