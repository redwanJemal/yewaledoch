# Telegram Bot Setup Guide — YeWaledoch

## 1. Create the Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Set display name: `YeWaledoch - የወላጆች`
4. Set username: `YeWaledochBot` (or your preferred username)
5. Copy the **BOT_TOKEN** — save it in your `.env` file

## 2. Set Bot Description

Send these commands to @BotFather:

```
/setdescription
```
Select your bot, then send:
```
የወላጆች — የኢትዮጵያ ወላጆች ማህበረሰብ። ለወላጆች ምክር፣ ተሞክሮ ማጋሪያ፣ እና ድጋፍ።

YeWaledoch — Ethiopian Parenting Community. Advice, shared experiences, and support for parents.
```

## 3. Set Bot About Text

```
/setabouttext
```
Select your bot, then send:
```
የኢትዮጵያ ወላጆች ማህበረሰብ 🇪🇹👶
```

## 4. Set Bot Commands

```
/setcommands
```
Select your bot, then send:
```
start - መጀመሪያ / Start
help - እርዳታ / Help
language - ቋንቋ ቀይር / Change language
```

## 5. Set Bot Profile Photo

```
/setuserpic
```
Select your bot, then upload a logo image (recommended: 512x512px).

## 6. Enable Mini App

1. Send `/newapp` to @BotFather
2. Select your bot
3. Enter app title: `YeWaledoch`
4. Enter app description: `Ethiopian Parenting Community`
5. Upload a 640x360 placeholder image for the app
6. Send the Web App URL: your production frontend URL (e.g., `https://yewaledoch.endlessmaker.com`)
7. Enter short name: `app`

## 7. Set Menu Button (Optional)

To add a "Open App" button in the bot chat:

```
/setmenubutton
```
Select your bot, then configure the menu button to open the Mini App URL.

## 8. Configure Environment

Add these to your production `.env` file:

```env
BOT_TOKEN=<token from step 1>
BOT_USERNAME=YeWaledochBot
MINI_APP_URL=https://yewaledoch.endlessmaker.com
ADMIN_TELEGRAM_IDS=<comma-separated admin Telegram user IDs>
```

## 9. Get Your Telegram ID

To find your Telegram user ID (needed for `ADMIN_TELEGRAM_IDS`):

1. Message [@userinfobot](https://t.me/userinfobot)
2. It will reply with your user ID
3. Add the ID to `ADMIN_TELEGRAM_IDS`

## 10. Verify Setup

1. Open your bot in Telegram
2. Send `/start` — the bot should respond
3. The Mini App button should open your web app
4. Test the auth flow: Mini App should authenticate via Telegram initData
