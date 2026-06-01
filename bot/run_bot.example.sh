#!/bin/bash
cd /home/abdo/french-flow
export ZEN_API_KEY="your_zen_api_key"
export FB_PAGE_ID="your_page_id"
export FB_ACCESS_TOKEN="your_page_access_token"
node bot/teacher.js >> bot/logs/hourly.log 2>&1
