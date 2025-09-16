Remove-Item ..\vip-report-template\node_modules\.vite\ -Recurse -Force
pnpm build
pnpm install
Push-Location ..\vip-report-template\
pnpm install
pnpm run dev
Push-Location ..\vip-report-api\
