function Read-AuthLog {
  [cmdletbinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$LogPath
  )

  # Use streaming to handle large files efficiently
  $reader = [System.IO.File]::OpenText($LogPath)
  while ($null -ne ($line = $reader.ReadLine())) {
    if ($line -match '(\w+)\s+(\d+)\s+(\d+:\d+:\d+)\s+(\S+)\s+(\S+)(?:\[(\d+)\])?: (.*)') {
      $month = $matches[1]
      $day = $matches[2]
      $time = $matches[3]
      $hostname = $matches[4]
      $process = $matches[5]
      $processId = if ($matches[6]) { [int]$matches[6] } else { $null }
      $message = $matches[7]

      # Construct a datetime object (assumes current year)
      $currentYear = (Get-Date).Year
      $dateString = "$month $day $currentYear $time"
      $dateTime = [datetime]::ParseExact(
        $dateString,
        'MMM d yyyy H:mm:ss',
        [System.Globalization.CultureInfo]::InvariantCulture
      )

      # Output object for each line
      [PSCustomObject]@{
        DateTime = $dateTime
        Month    = $month
        Day      = [int]$day
        Time     = $time
        Hostname = $hostname
        Process  = $process
        PID      = $processId
        Message  = $message
        RawLine  = $line
      }
    }
  }
  $reader.Close()
}

<#
# Example usage:
# Parse-AuthLog -LogPath "/var/log/auth.log" | Select-Object -First 10 | Format-Table -AutoSize

# Parse the entire file
$authLogs = Parse-AuthLog -LogPath "/var/log/auth.log"

# Filter for SSH login attempts
$sshLogins = $authLogs | Where-Object { $_.Process -eq "sshd" -and $_.Message -match "Accepted|Failed" }

# Get sudo commands
$sudoCommands = $authLogs | Where-Object { $_.Process -eq "sudo" }

# Export to CSV
$authLogs | Export-Csv -Path "auth_logs.csv" -NoTypeInformation

#>
