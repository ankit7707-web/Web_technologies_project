# Deploy Notionn

Notionn is now ready to deploy as a Node + SQLite app. The database is stored at `DATA_DIR/notionn.sqlite`, so production needs persistent disk storage.

## Render

1. Push this folder to a GitHub repository.
2. In Render, create a new Blueprint and select the repo.
3. Render will read `render.yaml`.
4. Keep the persistent disk mounted at `/data`.
5. After deploy, open the generated Render URL.

Demo login:

```text
demo@notionn.local
demo
```

## Docker

Build:

```powershell
docker build -t notionn .
```

Run with persistent SQLite storage:

```powershell
docker run --name notionn -p 3000:3000 -v notionn-data:/data notionn
```

Open:

```text
http://localhost:3000
```
