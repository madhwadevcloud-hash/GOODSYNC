# PowerShell Script to replace the SchoolDetails component
# This script will create a backup of the original file and then replace it with our new version

$original = "d:\appapa\InstitueERPWeb-5\InstitueERPWeb-5\frontend\src\roles\superadmin\components\SchoolDetails.tsx"
$new = "d:\appapa\InstitueERPWeb-5\InstitueERPWeb-5\frontend\src\roles\superadmin\components\SchoolDetails.new.tsx"
$backup = "d:\appapa\InstitueERPWeb-5\InstitueERPWeb-5\frontend\src\roles\superadmin\components\SchoolDetails.backup.tsx"

# Create a backup of the original file
Copy-Item -Path $original -Destination $backup
Write-Host "Created backup at $backup"

# Replace the original with our new file
Copy-Item -Path $new -Destination $original -Force
Write-Host "Replaced SchoolDetails component with the new version"

# Remove the temporary new file
Remove-Item -Path $new
Write-Host "Cleanup complete"

Write-Host "If you need to restore the original file, use the backup at: $backup"
