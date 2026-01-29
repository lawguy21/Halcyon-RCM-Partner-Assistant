# White-label mobile app build script for Windows
param(
    [string]$AppId = "com.rcmpartner.app",
    [string]$AppName = "RCM Partner",
    [string]$BundleId = "",
    [string]$Platform = "both"
)

if (-not $BundleId) { $BundleId = $AppId }

Write-Host "Building mobile app..."
Write-Host "  App ID: $AppId"
Write-Host "  App Name: $AppName"
Write-Host "  Platform: $Platform"

$env:MOBILE_APP_ID = $AppId
$env:MOBILE_APP_NAME = $AppName

Set-Location packages/web

npm run build

if ($Platform -eq "android" -or $Platform -eq "both") {
    Write-Host "Configuring Android..."
    npx cap sync android
    Write-Host "Android configured. Run: npx cap open android"
}

if ($Platform -eq "ios" -or $Platform -eq "both") {
    Write-Host "Configuring iOS..."
    npx cap sync ios
    Write-Host "iOS configured. Run: npx cap open ios"
}

Write-Host "Mobile build complete!"
