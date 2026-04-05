# IranDeals

IranDeals is a Telegram-first deals platform for the Iranian diaspora. It includes:

- a Telegram bot for subscribers and businesses
- an Express API for admin operations and analytics
- a React admin panel
- PostgreSQL and Redis for storage and queue/state support

## Repo Structure

- `irandeals-bot` — Telegram bot, API, Prisma schema, seed data
- `irandeals-admin` — Vite/React admin panel
- `docker-compose.yml` — local development stack
- `project.md` — product and implementation notes

## Local Run

1. Create `irandeals-bot/.env` from `irandeals-bot/.env.example`
2. Set at minimum:
   - `BOT_TOKEN`
   - `ADMIN_TELEGRAM_IDS`
   - `JWT_SECRET`
   - `ADMIN_UI_PASSWORD`
3. Start the stack:

```bash
docker compose up --build
```

Services:

- Bot API: `http://localhost:3000`
- Admin panel: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Admin Login

The seed creates an admin panel user with:

- Username: `admin`
- Password: value of `ADMIN_UI_PASSWORD` in `irandeals-bot/.env`

On startup the bot currently runs Prisma sync and seed automatically for local development.

## Public Channel Posting

If you want deals posted to a Telegram channel, set:

```env
PUBLIC_CHANNEL_ID=@YourChannelUsername
```

Then add the bot as an admin/member of that channel so it can publish messages.

## Notes

- The bot supports direct subscriber delivery and digest delivery.
- The admin panel uses `pixelwizards-components` for much of the UI.
- Location data is seeded from `irandeals-bot/prisma/seed.ts`.
