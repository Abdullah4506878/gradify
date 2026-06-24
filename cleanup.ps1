Remove-Item -Recurse -Force "E:\gradify\frontend\.next" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:TEMP\*" -ErrorAction SilentlyContinue
Write-Host "Cleanup done!" -ForegroundColor Green
Get-PSDrive C | Select-Object Name, @{N='Free(GB)';E={[math]::Round($_.Free/1GB,2)}}
