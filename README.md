# Squirdle

Migrate and Seed the Local Database:
```bash
bun db:init
```

Run the Development Server:
```bash
bun dev
```

Bundle the Application:
```bash
bun bundle
```

Serve the Application:
```bash
bun serve
```

NOTE: The DATABASE_URL environment variable while serving must be relative to the `out` directory or an absolute path.

FOR CARTER BECAUSE HE IS DOING LOW IQ SOLUTION
```bash
fly sftp shell
put squirdle.db /data/squirdle.db

fly ssh console
chown bun:bun /data/squirdle.db
chmod 644 /data/squirdle.db
exit

fly machine restart
```
