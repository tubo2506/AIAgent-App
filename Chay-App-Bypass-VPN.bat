@echo off
chcp 65001 >nul
title AI Agent Studio - Mo Ung Dung (Bypass Corporate Proxy)
cls
echo =====================================================================
echo    AI AGENT STUDIO - KHOI CHAY TRUC TIEP (BYPASS ZSCALER / VPN)
echo =====================================================================
echo.
echo [1/2] Dang kiem tra trinh duyet...

set APP_URL=https://ai-agent-25f66.web.app

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo [2/2] Dang mo Google Chrome ket noi truc tiep (bo qua Zscaler proxy)...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --no-proxy-server "%APP_URL%"
    goto :done
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo [2/2] Dang mo Google Chrome ket noi truc tiep (bo qua Zscaler proxy)...
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --no-proxy-server "%APP_URL%"
    goto :done
)

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo [2/2] Dang mo Microsoft Edge ket noi truc tiep (bo qua Zscaler proxy)...
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --no-proxy-server "%APP_URL%"
    goto :done
)

echo [!] Khong tim thay duong dan Chrome/Edge mac dinh. Dang mo trinh duyet he thong...
start "" "%APP_URL%"

:done
echo.
echo Da khoi chay ung dung! Ban co the dong cua so nay.
timeout /t 3 >nul
exit
